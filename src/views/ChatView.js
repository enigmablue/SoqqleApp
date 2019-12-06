import React, {Component, Fragment} from 'react';
import {
    SafeAreaView,
    Text,
    TouchableOpacity,
    View,
    ActivityIndicator,
    Image,
    Alert,
    TextInput,
    Platform,
    Dimensions,
    Animated,
    Modal,
    FlatList,
    TouchableHighlight,
    KeyboardAvoidingView,
    Keyboard,
    ImageBackground,
} from 'react-native';
import * as axios from 'axios';
import {Thumbnail, Fab, Card, CardItem, Body} from 'native-base';
import {SystemMessage} from 'react-native-gifted-chat';
import Bubble from '../giftedChat/Bubble';
// When we keyboard appears and rest of screen componenets disappear it messes up calculation for MessageContainer in default gifted chat.
// To compensate that we are using our customized GiftedChat so MessageContainer takes flex:1 size instead dynamic caluclation.
import {GiftedChat} from '../giftedChat/GiftedChat';
import InputToolbar from '../giftedChat/InputToolbar';
import {EVENT_BRAINDUMP_COMPLETE, EVENT_TASK_COMPLETE, EVENT_CHAT_MESSAGE,EVENT_GROUP_NAME_CHANGE, EVENT_LEAVE_GROUP} from '../constants'
import SocketIOClient from 'socket.io-client';
import {CountDownText} from 'react-native-countdown-timer-text';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import ImagePicker from 'react-native-image-picker';
import MixPanel from "react-native-mixpanel";
import {TASK_GROUP_TYPES, TASK_GROUP_OBJECTIVE, MAIN_COLOR} from '../constants';
import { createUpdateGroup } from "../realm/RealmHelper";
import {
    SAVE_TASK_PATH_API,
    UPDATE_USER_TASK_GROUP_API_PATH,
    GET_OBJECTIVE_API_PATH,
    CHAT_SOCKET_URL,
    GET_OBJECTIVE_BY_NAME_API_PATH,
    UPLOAD_TASK_FILE_API_PATH,
    TEAM_UPDATE_API,
    USER_TASK_GROUP_LIST_PATH_API,
    SAVE_USER_REWARD_LAST_USED_API_PATH
} from '../endpoints';
import styles from '../stylesheets/chatViewStyles';
import Header from '../components/Header';
import {patchGroup} from "../utils/patchutil";
import {getMessages, getuuid, getProfileImg, trackMixpanel, trackError} from '../utils/common';
import ReadMore from 'react-native-read-more-text';
//import Card from "../components/Card";
import {Client} from 'bugsnag-react-native';
import {BUGSNAG_KEY, API_BASE_URL} from "../config";
import _ from 'lodash';
import RewardModalHeader from "../components/RewardModalHeader";
import KeyboardSpacer from 'react-native-keyboard-spacer';
import BaseComponent from "./BaseComponent";
import { isSystemEvent, isUserEvent, setText } from "../utils/EventUtil";
import {showMessage} from 'react-native-flash-message';
import {  getUserTaskGroupsById, getUser, UpdateUserTaskGroup } from "../utils/grouputil";
import {  addMessage } from "../realm/RealmHelper";
import { getSocket } from "../utils/socket";

import { submitScreenShot } from '../utils/braindump';

import I18n from '../utils/localize'
import reactotron from 'reactotron-react-native';

const fontFamilyName = Platform.OS === 'ios' ? "SFUIDisplay-Regular" : "SF-UI-Display-Regular";
const bugsnag = new Client(BUGSNAG_KEY);

const instance = axios.create({
    baseURL: API_BASE_URL,
    timeout: 25000,
    headers: {'Content-type': 'application/json'}
});

const deviceWidth = Dimensions.get('window').width;
// TODO: Update this class to new Lifecycle methods
export default class ChatView extends BaseComponent {

  static flashMessage = message => showMessage({message, type: MAIN_COLOR});

    constructor(props) {
        super(props);
        const {navigation: {state: {params: {taskGroup = {}} = {}} = {}} = {}} = props;
        this.state = {
            taskGroup, //userTaskGroup
            group: null,
            userTask: {},
            processing: false,
            messages: [],
            userId: null,
            isReport: false,
            storyItemTextStyle: styles.storyItemImage,
            animatedStyle: {maxHeight: new Animated.Value(styles.contentHeight.maxHeight)},
            contentHeight: styles.contentHeight,
            rewardsVisible: false, //use this to show/hide Purchased Rewards model.
            dialogVisible: false,
            selectedReward: {},
            keyboardShow: false,
            editModalVisible: false,
            groupName: ''
        };

        this.onSend = this.onSend.bind(this);
        this._storeMessages = this._storeMessages.bind(this);
        
    }

    componentWillMount() {
        this.keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', this._keyboardDidShow);
        this.keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', this._keyboardDidHide);
        this.setTaskAndTaskGroup();
        trackMixpanel("Entered Chatroom (Chatview)")

    }

    componentDidMount() {

        super.componentDidMount();

        const {userActions} = this.props;
        this.props.navigation.addListener(
            'willFocus',
            () => {
                //  userActions.getMessageListRequest(this.state.taskGroup._team._id);
            }
        );

    }

    shouldComponentUpdate(nextProps, nextState)
    {
      return (
       !_.isEqual(nextProps, this.props) || !_.isEqual(nextState, this.state)
      );
    }

    refreshAppFromBackground (){
      //update the app with components needed after coming alive.
      console.log("APPSTATECHG CHATVIEW refreshAppFromBackground",this.state.group)
      instance.get(`${API_BASE_URL}/getGroupWithMessage?_id=${this.state.group._id}`)
          .then((response) => {
                  let group = response.data;
                  console.log("APPSTATECHG got response")
                  createUpdateGroup(group);
                  console.log("APPSTATECHG updated realm")
                  this.setState({group: group});
                  console.log("APPSTATECHG after set state")
          })
          .catch((error) => {
            console.log(error);
          bugsnag.notify(error)
        });

    }

    componentWillReceiveProps(nextProps) {

      if (nextProps.navigation.state.params.statusMessage) {
          // ChatView.flashMessage(nextProps.navigation.state.params.statusMessage);
      }

        if (nextProps.navigation.state.params.taskUpdated) {
            this.setTaskAndTaskGroup();
        }

        if (nextProps.reportUserSuccess && nextProps.reportUserSuccess != this.props.reportUserSuccess) {
            alert('Your report has been successfully submitted. We will take action against him.')
        }

        if (nextProps.navigation.state.params.msgContent) {
            const msg = nextProps.navigation.state.params.msgContent;
            const mediaType = nextProps.navigation.state.params.mediaType;
            const mediaDataURI = nextProps.navigation.state.params.mediaDataURI;

            nextProps.navigation.state.params.msgContent = null;
            nextProps.navigation.state.params.mediaType = null;
            nextProps.navigation.state.params.mediaDataURI = null;

            const msgUser = this.props.user;
            this.onSend([
                {
                    createdAt: new Date(),
                    _id: getuuid(),
                    user: {
                        _id: this.props.user._id,
                        name: this.props.user.profile.firstName,
                        avatar: msgUser.profile.pictureURL || `https://ui-avatars.com/api/?name=${msgUser.profile.firstName ? msgUser.profile.firstName : ''}+${msgUser.profile.lastName ? msgUser.profile.lastName : ''}`
                    }
                }
            ], msg, mediaType, mediaDataURI);
        }
    }

    componentWillUnmount() {


        this.keyboardDidShowListener.remove();
        this.keyboardDidHideListener.remove();
    }

    _keyboardDidShow = () => {
        this.setState({keyboardShow: true})
    }

    _keyboardDidHide = () => {
        this.setState({keyboardShow: false})
    }

    handleActiveRefresh(){
      console.log("Chatview handling active refresh")
      // handle view specific refresh
    }

    //this sets the group that will be used in the page
    setTaskAndTaskGroup() {
        let id = this.props.navigation.state.params.params ? this.props.navigation.state.params.params.task_group_id : this.props.navigation.state.params.task_group_id ;
        let idsArray =[];
        idsArray.push(id);

        let group = getUserTaskGroupsById(idsArray)[0];

        this.setState({group: group});

        if (group._team && group._team.conversation && group._team.conversation.messages && group._team.conversation.messages.length > 0) {
            let arrayMessages = getMessages(group, group._team.conversation.messages, this.props.user.blockUserIds, this.props.user);
            arrayMessages.reverse();
            this.setState({messages: arrayMessages});
        }


        /*if (Array.isArray(taskGroup.messages) && taskGroup.messages.length > 0) {
            let arrayMessages = getMessages(taskGroup, taskGroup.messages, this.props.user.blockUserIds, this.props.user);
            this.setState({messages: arrayMessages});
            } else if (Array.isArray(userTaskGroups)) {
            let messages = [];
            userTaskGroups.forEach(item => {
                if (item._id === id) {
                    messages = item.messages
                }
            });
            if (messages.length > 0) {
                let arrayMessages = getMessages(taskGroup, messages, this.props.user.blockUserIds, this.props.user);
                this.setState({messages: arrayMessages});
            }
        }*/


    }

    componentWillUnmount() {
        let st = this.state;
    }

    renderSystemMessage(props) {

        if (props.currentMessage.isReward || props.currentMessage.isJoining) {
            return (
                <SystemMessage
                    {...props}
                    wrapperStyle={{
                        backgroundColor: 'white',
                        width: deviceWidth
                    }}
                    textStyle={{
                        textAlign: 'center',
                        color: 'grey'
                    }}
                />
            );
        } else {
            return (
                <SystemMessage
                    {...props}
                    wrapperStyle={{
                        backgroundColor: '#dd79c9',
                        width: deviceWidth
                    }}
                    textStyle={{
                        textAlign: 'center',
                        color: 'white'
                    }}
                />
            );
        }

    }



    goToTask = story => {
        if (this.state.processing) {
            return;
        }
        const {group} = this.state;
        let objectiveName = group._userStory && group._userStory._objective.name;
        let objectiveType = group._userStory && group._userStory._objective.type;

        trackMixpanel("User started task ",this.state.group )

        if (objectiveType === TASK_GROUP_OBJECTIVE.BRAINDUMP || objectiveType.includes(TASK_GROUP_OBJECTIVE.BRAINDUMP)) {
             this.props.navigation.navigate('Braindump', {group: group,user: this.props.user, isToOpenCamera:true,isFromChatView:false,showStoryView:false});
            //this.props.navigation.navigate('Camera', {group: group, user: this.props.user, isFromChatView: false});
            return;
        }

        if (objectiveType === TASK_GROUP_OBJECTIVE.ILLUMINATE || objectiveType.includes(TASK_GROUP_OBJECTIVE.ILLUMINATE)) {
            this.props.navigation.navigate('Illuminate', {group: group});
            return;
        }

        if (objectiveType === TASK_GROUP_OBJECTIVE.DECODE || objectiveType.includes(TASK_GROUP_OBJECTIVE.DECODE)) {
            this.props.navigation.navigate('DecodeView', {group: group});
            return;
        }

        let taskGroupId = this.props.navigation.state.params.task_group_id;
        const {skill, reward, objectiveValue} = story;
        if (!skill) {
            return;
        }

        //deprecated. should only hit here when none of the objectives above are met. We will remove this in future after more testing.
      /*  if (Object.keys(this.state.userTask).length) {
            this.props.navigation.navigate('Task', {
                skill, reward,
                task: this.state.userTask,
                task_group_id: taskGroupId,
                team_id: this.state.group._team._id,
                taskGroup: this.state.group,
                objectiveValue
            });
        } else {
            this.setState({
                processing: true
            });
            instance.get(GET_OBJECTIVE_API_PATH.replace('{}', story._objective)).then(response => {
                let objectiveType = response.data && response.data.name.toLocaleLowerCase();
                if (objectiveType) {
                    this.createTask(story, objectiveType, taskGroupId);
                }
            }).catch((error) => {
                bugsnag.notify(error)
            });
        }*/
    };

    gotoRewards = story => {
        this.props.navigation.navigate('Rewards', {
            user: this.props.user,
        });
    };

    //used when determining whether to lock the user's start task button
    isTaskCompleted() {

        return this.state.userTask && this.state.userTask.status === 'complete';
    }

    //used when determining whether to lock the user's start task button
    isTaskRepeating() {

        return this.state.group && this.state.group._userStory && this.state.group.taskCounter && this.state.group.taskCounter > 0;
    }

    //used when determining whether to lock the user's start task button
    isTaskQuotaOver() {

        return this.state.group && this.state.group._userStory && this.state.group.taskCounter === this.state.group._userStory?.quota;
    }

    secondsUntilMidnight() {
        var midnight = new Date();
        midnight.setHours(24, 0, 0, 0)
        return parseInt((midnight.getTime() - new Date().getTime()) / 1000);
    }

	setMessagesWithOrder (msgs) {
        msgs.sort((x, y) => {
            return x.time - y.time;
        })
        msgs.reverse();
        this.setState({messages: msgs});
    }

    onSend(messages = [], brainMsg, mediaType = '', mediaDataURI = '') {
        let generateduuid = getuuid();
        let group = this.state.group;

        if (brainMsg) {
            const user = this.props.user;

            messages[0]._id = generateduuid
            messages[0].createdAt = new Date()
            messages[0].time = new Date()
            messages[0].text = brainMsg.text
            messages[0].user = {
                _id: user._id,
                name: user.profile.firstName,
                avatar: `https://ui-avatars.com/api/?name=${user.profile.firstName}+${user.profile.lastName}`
            }
            messages[0].image = brainMsg.image
            messages[0].status = 'loading'

            this.setState(previousState => {
                return {
                    messages: GiftedChat.append(previousState.messages, messages),
                };
            });

            if (this.state.group._team && this.state.group._team.conversation){
                this.state.group._team.conversation.messages.push[messages[0]];
            }

            // const parseISOString = (s) => {
            //     var b = s.split(/\D+/);
            //     return new Date(Date.UTC(b[0], --b[1], b[2], b[3], b[4], b[5], b[6]));
            // }

            submitScreenShot(
                brainMsg.taskId,
                brainMsg.text,
                brainMsg.content,
                brainMsg.group,
                user,
                this.props.userActions,
                mediaDataURI != '' ? mediaDataURI : brainMsg.image,
                mediaType
            )
            .then(() => {
                ChatView.flashMessage("SUCCESS");

                var msgs = this.state.messages;
                this.setState({messages: []});
                var i = msgs.indexOf(messages[0]);
                messages[0].status = 'success'
                msgs[i] = messages[0];

                this.setMessagesWithOrder(msgs);
            })
            .catch (error => {
                ChatView.flashMessage("FAILED");

                var msgs = this.state.messages;
                this.setState({messages: []});
                var i = msgs.indexOf(messages[0]);
                messages[0].status = 'failed'
                msgs[i] = messages[0];

                this.setMessagesWithOrder(msgs);
            })
        } else {
            messages[0].sender = this.props.user._id
            messages[0].receiver = group._team._id
            messages[0].chatType = 'GROUP_MESSAGE'
            messages[0].userProfile = this.props.user
            messages[0].time = new Date().toISOString()
            messages[0].groupId = group._id
            messages[0].type = EVENT_CHAT_MESSAGE

            let convoid;
            if (group._team && group._team.conversation){
                convoid=group._team.conversation._id;
            }

            getSocket().emit('client:message', {
                msgId: generateduuid, //special id to synch server and client ids
                sender: messages[0].sender,
                receiver: messages[0].receiver,
                chatType: messages[0].chatType ,
                type: messages[0].type,
                conversationId: convoid,
                userProfile: messages[0].userProfile,
                time: messages[0].time ,
                groupId: messages[0].groupId ,
                message: messages && messages[0] && messages[0]['text'] ? messages[0]['text'] : ''
            });
            const {taskGroups: {taskGroups = []} = {}} = this.props;
            const id = this.props.navigation.state.params.task_group_id;
            //what is the below for?!?! god knows
            let index = id && taskGroups.findIndex(t => t._id === id);
            if (index > -1) {

                let oldMessages = [];
                if (taskGroups && taskGroups[index] && taskGroups[index]._team && taskGroups[index]._team.conversation && taskGroups[index]._team.conversation.messages) {
                    oldMessages = [...taskGroups[index]._team.conversation.messages];
                }
                oldMessages.unshift({
                    createdAt: new Date(),
                    time: new Date().toISOString(),//new Date(new Date().toString().split('GMT')[0]+' UTC').toISOString(),//new Date(),
                    sender: this.props.user._id,
                    receiver: this.state.group._team._id,
                    chatType: 'GROUP_MESSAGE',
                    type: EVENT_CHAT_MESSAGE,
                    userProfile: this.props.user,
                    _id: new Date(),
                    message: messages && messages[0] && messages[0]['text'] ? messages[0]['text'] : ''
                })
                taskGroups[index]['messages'] = oldMessages;
                this.props.userActions.getUserTaskGroupsCompletedWithMessage({taskGroups});

            }

            this._storeMessages(messages,generateduuid);
        }
    }

    showReportAlertInformation() {
        alert('You need to long press on the chat for reporting it to the admin.')
    }

    reportConfirmation(message) {
        if (message.user._id != this.props.user._id) {
            var alertTitle = 'Report?', alertMessage = 'Are you sure to report this chat?'
            Alert.alert(
                alertTitle,
                alertMessage,
                [
                    {
                        text: 'Cancel',
                        onPress: () => console.log('Cancel Pressed'),
                        style: 'cancel',
                    },
                    {text: 'Ok', onPress: () => this.callApiToReportUser(message)},
                ]
            )
        }
    }

    callApiToReportUser(message) {
        let username = '';
        if (message.username) {
            username = message.username;
        }
        let arrayParam = {
            'title': "Reported User from Chat",
            'description': `The user ${message.user._id} ${message.user.name} has been reported by ${this.props.user.profile.lastName} ${this.props.user.profile.lastName} in the usergroup chat ${this.state.group._id}`,
            'reporter': `${this.props.user._id}`,
            'status': 'Open',
            'priority': 3,
            'history': [],
            'comments': [message.text]
        };
        const {userActions} = this.props;
        userActions.reportUserRequested(arrayParam);
        this.setState({isReport: true})
    }

    _storeMessages(messages,generateduuid) {

        var newMsg = [...messages];
        const parseISOString = (s) => {
            var b = s.split(/\D+/);
            return new Date(Date.UTC(b[0], --b[1], b[2], b[3], b[4], b[5], b[6]));
        }

        /**
        Any messagse without time would break the order of messages.
        So, the time argument is added to the message.
        And to parse parseISOString is for the case that message with iso string "2019-10-05T10:00:00:000Z" is inserted.
        */

        if ((typeof newMsg[0].time) === "string" && newMsg[0].time.indexOf("-") >= 0){
            newMsg[0].time = parseISOString(newMsg[0].time)
        } else if (!newMsg[0].time) {
            newMsg[0].time = new Date();
            messages[0].time = new Date();
        }

        this.setState(previousState => {
            return {
                messages: GiftedChat.append(previousState.messages, newMsg),
            };
        });

        if (this.state.group._team && this.state.group._team.conversation){
          this.state.group._team.conversation.messages.push[newMsg[0]];
        }

        addMessage(this.state.group, this.props.user, messages[0],generateduuid); //the current message is the first message

    }

    navigateToUserList() {
        this.props.navigation.navigate('UsersList', {taskGroupData: this.state.group});
    }

    navigateToUserList() {
        this.props.navigation.navigate('UsersList', {taskGroupData: this.state.group})
    }

    renderBubble(props) {
        return (
            <Bubble
                {...props}
                wrapperStyle={{
                    right: {
                        borderBottomRightRadius: 0,
                        backgroundColor: '#4FBFBA',
                    },
                    left: {
                        borderBottomLeftRadius: 0,
                        backgroundColor: '#56478C',
                    }
                }}
                textProps={{style: {color: 'white'}}}
            />
        )
    }


    onReceivedMessage(message) {
        let group = this.state.group;
        // reject messages intended for other groups
        if (message.receiver !== group._team._id) {
            return;
        }
        super.onReceivedMessage(message); //calls the parent received message which will update the task object if the event is suitable
        let setId = message._id;
        let setMsgId = message.msgId;
        if (!setId)  {   setId= getuuid(); }
        if (!setMsgId)  {   setMsgId= getuuid(); }
        let uri;

        let messageReceived = [],  messageProperty = {
        // _id: Math.random(),
          sender: message.sender,
          receiver:message.receiver,
          _id: setId,
          msgId: setMsgId,
          createdAt: new Date(),
          text: setText( group, message),
          time: message.time
        };

        if (message.userProfile && message.type != 'server:message') {
          uri=getProfileImg (message.userProfile.profile);
          messageProperty= { ...messageProperty,
            user: {
            _id: message.sender,
              name: message.userProfile.profile.firstName ? message.userProfile.profile.firstName : '' + ' ' + message.userProfile.profile.lastName ? message.userProfile.profile.lastName : '',
              avatar: uri,
                    } ,
                  }
                }

        //let messageProperty= mapMessageProperty(group, this.props.user, message);

        // reject messages from myself where size of the group is > 1. This is because right now when there is multi users somehow theres a spam broadcast msg.
        if (message.userProfile && message.userProfile._id === this.props.user._id && group._team.users.length > 1 && message.fromMe) {
            return;
        }

        let isUnBlocked = true, blockUserIds = this.props.user.blockUserIds;
        if (message.user && blockUserIds.length > 0 && blockUserIds.indexOf(message.user._id) !== -1) {
            isUnBlocked = false;
        }


        if (message.type == EVENT_LEAVE_GROUP && message.refId == this.props.user._id)
        {
          alert("You have been kicked!");
          this.props.navigation.navigate({ routeName: "UserTaskGroup" });
        }

        if (isSystemEvent(message.type))  {
            messageProperty= { ...messageProperty,
              system: true
            }
        }

        if (message.image) {
            messageProperty= { ...messageProperty,
                image: message.image
            }
        }

        if (message.isJoining) {
            messageProperty= { ...messageProperty,
                isJoining: true
            }
        }

        if (message.isReward) {
            messageProperty= { ...messageProperty,
                isReward: message.isReward
            }
        }

        messageReceived.push(messageProperty)
        this._storeMessages(messageReceived,message.msgId);

        /*if (userData && userData.userDetails && userData.userDetails.profile && isUnBlocked) {
            //if message.isReward is true this means its a reduction message.
            if (message.message == 'Task is completed' || message.isReward) {
                // used lodash so if no Value found default will be present
                // which is last param of get method
                const firstName = _.get(userData, 'userDetails.profile.firstName');
                const storyName = group ? _.get(group, '_tasks[0].name', 'Task') : 'Task';
                const sparks = group ? _.get(group, 'leftBonusSparks', 0) : 0;
                let messageReceived;
                if (message.isReward) {
                    //if message is spark reduction type then send message as it is.
                    messageReceived = [
                        {
                            _id: Math.random(),
                            text: message.message,
                            createdAt: new Date(),
                            system: true,
                            isReward: message.isReward
                        },
                    ];
                } else {
                    messageReceived = [
                        {
                            _id: Math.random(),
                            text: `${firstName} finishes ${storyName}. (${sparks} sparks)`, //this modification is needed because the sender (taskview.js) needs to send a generic message "Task is Completed" so this onReceive message can detect its a completion message. If you have a better idea, let me know! -dan
                            createdAt: new Date(),
                            system: true,
                            isReward: message.isReward
                        },
                    ];
                }
                this._storeMessages(messageReceived);
             //   this.refreshUserTask()


            }else if(message.type == EVENT_BRAINDUMP_COMPLETE && !message.fromMe){
                let messageReceived = [
                    {
                        _id: Math.random(),
                        text: message.message,
                        createdAt: new Date(),
                        user: {
                            _id: userData.userDetails._id,
                            name: userData.userDetails.profile.firstName ? userData.userDetails.profile.firstName : '' + ' ' + userData.userDetails.profile.lastName ? userData.userDetails.profile.lastName : '',
                            avatar: userData.userDetails.profile.pictureURL || `https://ui-avatars.com/api/?name=${userData.userDetails.profile.firstName ? userData.userDetails.profile.firstName : ''}+${userData.userDetails.profile.lastName ? userData.userDetails.profile.lastName : ''}`
                        },
                        image: message.image
                    }
                ];
                this._storeMessages(messageReceived);
            } else if (message.type != EVENT_BRAINDUMP_COMPLETE){
                let messageReceived = [
                    {
                        _id: Math.random(),
                        text: message.message,
                        createdAt: new Date(),
                        isReward: message.isReward,
                        user: {
                            _id: userData.userDetails._id,
                            name: userData.userDetails.profile.firstName ? userData.userDetails.profile.firstName : '' + ' ' + userData.userDetails.profile.lastName ? userData.userDetails.profile.lastName : '',
                            avatar: userData.userDetails.profile.pictureURL || `https://ui-avatars.com/api/?name=${userData.userDetails.profile.firstName ? userData.userDetails.profile.firstName : ''}+${userData.userDetails.profile.lastName ? userData.userDetails.profile.lastName : ''}`
                        },
                    },
                ];
                this._storeMessages(messageReceived);
            }
        }else {
            let messageReceived = [
                {
                    _id: Math.random(),
                    text: message.message,
                    createdAt: new Date(),
                    // user: {
                    //     _id: userData.userDetails._id,
                    //     name: userData.userDetails.profile.firstName ? userData.userDetails.profile.firstName : '' + ' ' + userData.userDetails.profile.lastName ? userData.userDetails.profile.lastName : '',
                    //     avatar: userData.userDetails.profile.pictureURL || `https://ui-avatars.com/api/?name=${userData.userDetails.profile.firstName ? userData.userDetails.profile.firstName : ''}+${userData.userDetails.profile.lastName ? userData.userDetails.profile.lastName : ''}`
                    // },
                },
            ];
            this._storeMessages(messageReceived);
        }*/
    }


    render() {
      console.log("chatview render")
        const {group, keyboardShow} = this.state;

        const isRepeating = this.isTaskRepeating();
        const isQuotaOver = this.isTaskQuotaOver();
        //const isCompleted = this.isTaskCompleted();
        const secondsUntilMidnight = this.secondsUntilMidnight();
        const uri = getProfileImg (this.props.user.profile);
        const user = {
            _id: this.props.user._id,
            name: this.props.user.profile.firstName ? this.props.user.profile.firstName : '' + ' ' + this.props.user.profile.lastName ? this.props.user.profile.lastName : '',
            avatar: uri,
        };
        const story = group._userStory;

        const taskGroupType = group.type;

        // this is used to derive how many additional members to show in the group members section of the GUI
        let image1, image2, countExtraMember;
        if (group._team && group._team.users){
          countExtraMember = group._team.users.length - 2;
          // Now showing photos
          if (group._team.users.length > 0) {
              let user = this.state.group._team.users [0];
              const uri = getProfileImg (user.profile);
              image1 = <Thumbnail
                  style={styles.member1}
                  source={{uri: uri }}/>;
          }
          if (group._team.users.length > 1) {
              let user = this.state.group._team.users [1];
              const uri = getProfileImg (user.profile);
              image2 = <Thumbnail
                  style={styles.member2}
                  source={{uri: uri }}/>;
          }
        }

        return (
            <Fragment>
                 <ImageBackground source={require('../images/backblue.png')}
                                 style={{width: '100%', height: Platform.OS === 'ios' ? 94 : 57, flex: 0}}>
                    <SafeAreaView style={{flex: 0, backgroundColor: "transparent"}}>
                        <Header
                            title={group.name + '...'}
                            navigation={this.props.navigation}
                            bottomText={story.quota ? `${group._team.users.length} of ${story.quota} Members Online` : ''}
                            showEditIcon={group._user._id === this.props.user._id}
                            onEditIconClick={() => this.onEditIconClick()}
                            headerStyle={styles.headerStyle}
                            fontStyle={styles.fontStyle}
                            headerTitleStyle={styles.headerTitleStyle}
                            ShowInfoIcon={true}
                            TaskGroupData={group}
                            onInfoPress={this.props.navigation}
                            headerRightTextStyle={styles.headerRightTextStyle}
                        />
                    </SafeAreaView>
                </ImageBackground>

                <SafeAreaView style={{flex: 1, backgroundColor: '#FFF'}}>
                    {!keyboardShow && this._renderRewardsModal()}
                    {!keyboardShow && this._renderUsingRewardModal()}
                    {this._renderEditModal()}
                    {!keyboardShow && <View style={styles.storyDetailView}>


                        <View style={{
                            backgroundColor: '#3c1464',
                            alignContent: 'center',
                            justifyContent: 'center',
                            padding: 10
                        }}>
                            <Text style={styles.storyDetailTagTitle}>You Gain.</Text>
                            <View style={styles.storyDetailTags}>
                                <View style={{flexDirection: 'row'}}>
                                    <Text style={styles.storyDetailTag}>50 xp</Text>
                                    {story.reward && (
                                        taskGroupType === TASK_GROUP_TYPES.CHALLENGE ? (
                                            <Text style={styles.storyDetailTag}>
                                                {`${story.rewardValue || ''} ${story.reward} `}
                                            </Text>
                                        ) : (
                                            <Text style={styles.storyDetailTag}>
                                                {`${story.reward.value || ''} ${story.reward.type} `}
                                            </Text>
                                        )
                                    )}
                                    {group.leftBonusSparks ? (
                                        <View style={styles.storyBonusSparkTag}>
                                            <Text
                                                style={styles.storyBonusSparkTagText}>Bonus: {group.leftBonusSparks < 1 ? 0 : group.leftBonusSparks} sparks</Text>
                                            {story.reducePerRefresh && (
                                                <Text
                                                    style={styles.storyBonusSparkTagTextHighlight}>-{story.reducePerRefresh}</Text>
                                            )}
                                        </View>
                                    ) : null}

                                    <TouchableOpacity
                                        onPress={() => this.goToTask(story)}
                                        disabled={isQuotaOver}>
                                        <View style={
                                            {
                                                ...styles.storyDetailActionTag,
                                                backgroundColor: isQuotaOver ? '#0000004D' : '#1FBEB8',
                                            }
                                        }>
                                            {this.state.processing ? (
                                                <ActivityIndicator size={Platform.OS === 'ios' ? 'small' : 18}
                                                                   style={{paddingHorizontal: 14}} color="#ffffff"/>
                                            ) : (isQuotaOver ? (
                                                        <View style={{flexDirection: 'row', alignItems: 'center'}}>
                                                            <Icon name="timer" size={16} color="#ffffff"/>
                                                            <CountDownText
                                                                style={{color: '#ffffff', fontSize: 13}}
                                                                countType='date'
                                                                auto={true}
                                                                afterEnd={() => {
                                                                }}
                                                                timeLeft={secondsUntilMidnight}
                                                                step={-1}
                                                                startText={I18n.t("startTask")}
                                                                endText={I18n.t("startTask")}
                                                                intervalText={(date, hour, min, sec) => hour + ':' + min + ':' + sec}
                                                            />
                                                        </View>
                                                    )
                                                    : (
                                                        <Text style={{
                                                            color: '#ffffff',
                                                            fontSize: 13,
                                                            fontFamily: fontFamilyName
                                                        }}>

                                                            {isRepeating ? I18n.t("startTask") + (this.state.group.taskCounter + 1) + '/' + this.state.group._userStory.quota
                                                                : I18n.t("startTask")}

                                                        </Text>
                                                    )
                                            )}
                                        </View>
                                    </TouchableOpacity>
                                </View>
                            </View>

                        </View>
                        <View style={{backgroundColor: '#9600A1', height: 5, width: '100%'}}/>
                    </View>}
                    {!keyboardShow && this.state.selectedImage ?
                        <View style={{paddingHorizontal: 15}}>
                            <View style={{padding: 4, borderRadius: 10, flexDirection: 'row'}}>
                                <Image source={this.state.selectedImage}
                                       style={{height: 70, width: 70, borderRadius: 10, marginRight: 5}}/>
                                <View style={{flexDirection: 'row', alignItems: 'center'}}>
                                    <TouchableOpacity onPress={() => this.uploadSelectedImage(story)} style={{
                                        backgroundColor: "#1FBEB8",
                                        borderRadius: 15,
                                        flexDirection: 'row'
                                    }}>
                                        <View style={{paddingRight: 6, flexDirection: 'row', alignItems: 'center'}}>
                                            {this.state.processing ? (
                                                <ActivityIndicator size={Platform.OS === 'ios' ? 'small' : 30}
                                                                   color="#ffffff"/>
                                            ) : <Icon name="progress-upload" size={30} color="#FFF"/>}
                                            <Text style={{fontSize: 12, color: "#FFF"}}>Submit for approval</Text>
                                        </View>

                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => this.removeSelectedImage()}>
                                        <Icon name="close-circle-outline" size={30} color="#0000004D"/>
                                    </TouchableOpacity>
                                </View>
                            </View>

                        </View>
                        : null}
                    {!keyboardShow && <TouchableOpacity style={styles.faceButton}
                                                        onPress={() => this.props.navigation.navigate('UsersList', {taskGroupData: this.state.group})}>
                        <View style={styles.viewShowMember}>
                            {image1}
                            {image2}
                            {countExtraMember > 0 &&
                            <View style={styles.plusMemberView}>
                                <Text style={styles.plusTxt}>
                                    +{countExtraMember}
                                </Text>
                            </View>
                            }
                        </View>
                    </TouchableOpacity>}


                    <View style={[{flex: 1}]}>
                        <GiftedChat
                            keyboardShouldPersistTaps={"never"}
                            messages={this.state.messages}
                            onSend={messages => this.onSend(messages)}
                            extraData={this.state}
                            user={user}
                            showUserAvatar={true}
                            renderInputToolbar={this._renderGiftedToolBar}
                            showAvatarForEveryMessage={true}
                            onLongPress={(context, message) => this.reportConfirmation(message)}
                            renderSystemMessage={this.renderSystemMessage.bind(this)}
                            renderBubble={this.renderBubble.bind(this)}
                        />
                    </View>
                </SafeAreaView>
                {Platform.OS === 'ios' && <KeyboardSpacer/>}
                <SafeAreaView style={{backgroundColor: '#3C1364', flex: 0}}/>
            </Fragment>
        );

    }

    _renderGiftedToolBar = (inputToolbarProps) => {

        // we customized the gifted chat and input toolbar because of bugs with either the bar missing or a big space when entering text.
        // refer to https://github.com/FaridSafi/react-native-gifted-chat/issues/1102
        // using our customized InputToolbar with textInput position as relative instead of absolute
        // with position relative it always move up when keyboard appears instead of disappering behind it.
        return (
            <InputToolbar
                {...inputToolbarProps}
            />);
    }
    _renderTruncatedFooter = (handlePress) => {
        return (
            <Text style={styles.showOrLess} onPress={() => {
                handlePress();
                Animated.timing(this.state.animatedStyle.maxHeight, {
                    toValue: styles.contentHeightMax.maxHeight,
                    duration: 500
                }).start(function () {

                });
            }}>
                more
            </Text>
        );
    }

    _renderRevealedFooter = (handlePress) => {

        return (
            <Text style={styles.showOrLess} onPress={() => {
                Animated.timing(this.state.animatedStyle.maxHeight, {
                    toValue: styles.contentHeight.maxHeight,
                    duration: 500
                }).start(function () {
                    handlePress();
                });
            }}>
                less
            </Text>
        );
    }

    onEditIconClick = () => {
        this.setState({
            editModalVisible: true
        })
    }

    setModalVisible(visible){
        this.setState({
            editModalVisible: visible
        })
    }

    onSubmitBtnClicked() {


      const data = {
          "newName": this.state.groupName,
          "_id": this.state.group._id
      }

      this.setModalVisible(false);

      instance.post(`${API_BASE_URL}/saveTaskGroup`, data).then(response => {
              if (response) {

                savedGroup= response.data;
                  getSocket().emit('client:message', {
                      msgId: getuuid(),
                      sender: this.props.user._id,
                      receiver: savedGroup._team._id,
                      chatType: 'GROUP_MESSAGE',
                      type: EVENT_GROUP_NAME_CHANGE,
                      groupId: savedGroup._id,
                      time: new Date().toISOString(),
                      message: 'The group name has changed to ' + this.state.groupName ,
                      isJoining: true,
                      userProfile: this.props.user
                  });


                //this.state.group.name=this.state.groupName;

                  createUpdateGroup(response.data);
                  savedGroup._team.conversation.messages=this.state.messages;
                  this.setState({group: savedGroup});

                //  this.refreshUserTask()
              }

          }).catch((error) => {
            trackError(error);
              console.error(error);
              bugsnag.notify(error)
          });
    }

    onCancelBtnClicked() {
        this.setModalVisible(false)
    }

    _renderEditModal() {
        return (
            <Modal
                        animationInTiming={1000}
                        animationType={"slide"}
                        transparent={true}
                        visible={this.state.editModalVisible}
                        style={[styles.modalContent, { justifyContent: "flex-end", margin: 0 }]}
                        onRequestClose={this.setModalVisible.bind(this)}
                        onBackdropPress={this.setModalVisible.bind(this)}
                        onSwipeComplete={this.setModalVisible.bind(this)}
                    >
              <View style={styles.likeModalView}>
            <View style={styles.editGroupNameModalInnerView}>
            <Text style={styles.editGroupNameDialogTitle}>{I18n.t("enterGroupName")}</Text>

            <TextInput
            autoCapitalize="none"
            keyboardType="default"
            underlineColorAndroid="transparent"
            placeholder={'Enter group name'}
            placeholderTextColor="#a4b0be"
            style={styles.inputStyle}
            value={this.state.groupName}
            onChangeText={groupName => {
              this.setState({ groupName });
            }}
          />

            <View style={{
                flex: 0,
                flexDirection: 'row'
            }}>
            <TouchableOpacity onPress={this.onSubmitBtnClicked.bind(this)}>
                <Text style={styles.submitBtn}>{I18n.t("submit")}</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={this.onCancelBtnClicked.bind(this)}>
                <Text style={styles.submitBtn}>{I18n.t("cancel")}</Text>
            </TouchableOpacity>
            </View>

          </View>
          </View>
          </Modal>
        )
    }



    _renderRewardsModal() {
        return (
            <SafeAreaView>
                <Modal
                    animationType={'slide'}
                    transparent={false}
                    visible={this.state.rewardsVisible}
                    onRequestClose={() => {
                        this._handleModalVisibility(false)
                    }}>

                    <View style={styles.modal}>
                        <RewardModalHeader title='Rewards' navigation={this.props.navigation} onLeft={() => {
                            this._handleModalVisibility(false)
                        }}/>

                        <FlatList
                            renderItem={this._renderListItem.bind(this)}
                            data={this.props.user.userRewards}
                            keyExtractor={item => item._id}/>
                    </View>
                </Modal>
            </SafeAreaView>
        );
    };

    _renderListItem(rewardItem) {
        if (rewardItem?.item?.reward?._upgrade != null) {
            return (
                <TouchableOpacity style={styles.rewardItemRoot} onPress={() => {
                    this.setState({
                        selectedReward: rewardItem
                    });
                    this._showUsingRewardPopup()
                }}>
                    <Image style={styles.rewardsImg} source={rewardsImg}/>
                    <View style={styles.rewardItemContainer}>
                        <Text style={styles.rewardItemTitle}>{rewardItem.item.reward._upgrade.name}</Text>
                        <Text style={styles.rewardItemDesc}
                              ellipsizeMode='tail'
                              numberOfLines={3}
                        >
                            {rewardItem.item.reward._upgrade.description}
                        </Text>
                        <Text style={styles.rewardItemCounter}>{rewardItem.item.reward._upgrade.sparks}</Text>
                    </View>

                </TouchableOpacity>
            );
        } else {
            return (
                <View/>
            );
        }
    };

    _handleModalVisibility = (visibility) => {
        this.setState({
            rewardsVisible: visibility
        })
    };

    _handleTextReady = () => {
        // ...
    };

    _showUsingRewardPopup() {
        this._setModalVisible(true)
    }

    onRequestCloseModal() {
        this._setModalVisible(!this.state.dialogVisible);
    }

    _renderUsingRewardModal() {
        return (
            <Modal
                animationType="fade"
                transparent={true}
                visible={this.state.dialogVisible}
                onRequestClose={this.onRequestCloseModal.bind(this)}
            >
                <View style={styles.likeModalView}>
                    <View style={styles.likeModalInnerView}>
                        <Text style={styles.likeModalTitle}>You will use the Reward:</Text>
                        <Text
                            style={styles.likeModalTitle}>{this.state.selectedReward?.item?.reward?._upgrade?.name}</Text>
                        <View>
                            <Text style={styles.likeModalText}>Extend the Group Bonus Spark
                                by {this.state.selectedReward?.item?.reward?._upgrade?.usageValue} Number of
                                Uses: {this.state.selectedReward?.item?.reward?._upgrade?.sparks} |
                                Reset Weekly</Text>

                            {this.state.processing ? (
                                <ActivityIndicator size={Platform.OS === 'ios' ? 'small' : 22}
                                                   style={{paddingHorizontal: 14}} color="#1FBEB8"/>
                            ) : (
                                <TouchableOpacity
                                    onPress={() => this._onRewardConfirm()}>
                                    <Text style={{
                                        ...styles.likeModalAction
                                    }}>
                                        Confirm
                                    </Text>
                                </TouchableOpacity>
                            )}

                        </View>
                        <TouchableOpacity
                            onPress={this.onRequestCloseModal.bind(this)}
                            style={styles.likeModalClose}
                        >
                            <View>
                                <Icon name='close' style={styles.likeModalCloseIcon}/>
                            </View>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        );
    }

    _setModalVisible(visible) {
        this.setState({dialogVisible: visible});
    }

    _onRewardConfirm() {
        if (!this.state.processing) {
            this.setState({processing: true});
            const userId = this.props.user?._id;
            const rewardId = this.state.selectedReward?.item?.reward?._upgrade?._id;
            let endpoint = SAVE_USER_REWARD_LAST_USED_API_PATH.replace('{userId}', userId);
            endpoint = endpoint.replace('{rewardId}', rewardId);
            const reducedSpark = this.state.selectedReward?.item?.reward?._upgrade?.usageValue;
            instance.get(endpoint).then(response => {
                this.setState({processing: false});
                if (response != null) {
                    getSocket().emit('client:message', {
                        sender: this.props.user._id,
                        receiver: this.state.group._team._id,
                        chatType: 'GROUP_MESSAGE',
                        type: EVENT_CHAT_MESSAGE,
                        time: new Date().toISOString(),
                        userProfile: this.props.user,
                        message: 'Bonus Sparks has reduced by ' + reducedSpark + '! Complete your tasks now!',
                        isReward: true
                    });
                    //this.state.selectedReward?.item?.currentCounter++;
                    this.onRequestCloseModal();
                }

            }).catch((error) => {
                this.setState({processing: false});
                bugsnag.notify(error)
            });
        }
    }

}
const rewardsImg = require('../../assets/images/rewardsImg.png');
