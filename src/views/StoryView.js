import React, { Component } from "react";
import {
    ActivityIndicator,
    DeviceEventEmitter,
    Dimensions,
    Image,
    SafeAreaView,
    Text,
    ImageBackground,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
    Animated,
    FlatList,
    Platform,
    ScrollView,
    StatusBar,
    Alert
} from 'react-native';
import { Thumbnail } from 'native-base';
//import Video from 'react-native-video';
import * as axios from 'axios';
import { widthPercentageToDP as wp, widthPercentageToDP, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import Icon from 'react-native-vector-icons/FontAwesome';
import Carousel from 'react-native-snap-carousel';
import _ from 'lodash';
import TextImage from './TextImage';
import LinearGradient from 'react-native-linear-gradient';
import * as grouputil from "../utils/grouputil";
import MixPanel from 'react-native-mixpanel';
import Modal from 'react-native-modal';
import * as Constants from '../constants';
import {
    CHALLENGE_IMAGE_BASE_URL,
    STORY_IMAGE_BASE_URL,
    STORY_VIDEO_BASE_URL,
    TASK_GROUP_TYPES
} from "../constants";
import { API_BASE_URL } from "../config";
import {
    SAVE_USER_TASK_GROUP_API,
    TEAM_UPDATE_API,
    USER_ACHIEVEMENT_LIST_PATH_API,
    USER_TASK_GROUP_LIST_PATH_API,
    CHAT_SOCKET_URL,
    CREATE_TEAM_GROUP_API
} from "../endpoints";
import styles from "../stylesheets/storyViewStyles";
import CustomText from "../components/CustomText";
import { Client } from "bugsnag-react-native";
import { BUGSNAG_KEY } from "../config";
import { patchUserStory, patchFeid, patchQuestions, patchPushToken } from "../utils/patchutil";
import { getGroupUserDetails, getuuid, getProfileImg, trackMixpanel, trackError, patchConversation } from "../utils/common";
import BaseComponent from "./BaseComponent";
import MaterialIcon from 'react-native-vector-icons/MaterialCommunityIcons'
import codePush from "react-native-code-push";
import { PanGestureHandler, State } from 'react-native-gesture-handler';
let codePushOptions = { checkFrequency: codePush.CheckFrequency.MANUAL };
const bugsnag = new Client(BUGSNAG_KEY);
const fontFamilyName = Platform.OS === 'ios' ? "SFUIDisplay-Regular" : "SF-UI-Display-Regular";
import { getSocket } from "../utils/socket";
import QRScanModal from "../components/QRScanModal";
const width = Dimensions.get("window").width; //full width
const height = Dimensions.get('window').height // full width
import FastImage from 'react-native-fast-image';
let scan = false;


import I18n from '../utils/localize'

const instance = axios.create({
    baseURL: API_BASE_URL,
    timeout: 25000,
    headers: { "Content-type": "application/json" }
});

let selectedItemId = null;
let selectedItemType = null;
let selectedItemBonusSparks = null;
let path = 3;
let tem = [1, 2, 3];
import { filterStories } from "../utils/WorldUtil";
import { getStories, createUpdateGroup } from "../realm/RealmHelper";


import MysteryCard from '../components/MysteryCard';
// import console = require("console");

// TODO: Update this class to new Lifecycle methods
// TODO: Split this render component into smaller one
class StoryView extends BaseComponent {


    goToDashboardScreen = () =>
        this.props.navigation.navigate({ routeName: "Dashboard" });
    goToProfileScreen = () =>
        this.props.navigation.navigate({ routeName: "FeedView" });
    goToUserTasksScreen = () =>
        this.props.navigation.navigate({ routeName: "UserTaskGroup" });


    itemPressed = (id, type, bonusSparks, maxnum) => {
        if (this.state.isStoryLocked) {
            return //if stories are locked then just bypass the onPress.
        }
        this.setModalVisible(
            !this.state.modalVisible,
            id,
            type,
            bonusSparks,
            maxnum
        );
    }

    itemCategoryCartPressed = (id, type, bonusSparks, maxnum) => {
        this.itemPressed(id, type, bonusSparks, maxnum);
    }

    onMorePressed = () => {
        if (this.state.morePressed) {
            this.setState({ morePressed: false })
        } else {
            this.setState({ morePressed: true })
        }
    }

    _renderStoryTaskItem = group => {
        if (!group._user) {
            return;
        }
        const userStory = group._userStory;
        const groupName = group.name;
        const teamLength = group._team.users.length;
        let minutes = this.timeDifference(new Date(), new Date(group.createdAt));
        let image1 = "",
            arrayGroupImage = [],
            userName = "";
        if (group._user.profile.firstName) {
            userName = group._user.profile.firstName;
        }
        //Group Created user
        imageUser = (
            <Thumbnail
                style={styles.member1}
                source={{ uri: getProfileImg(group._user.profile) }}
            />
        );
        // Group members
        let counter = 0;
        let loopLength =
            group._team.users.length < 3 ? group._team.users.length : 3;
        while (counter < loopLength) {
            let user = group._team.users[counter];

            if (user && group._user._id != user._id) { //creator of group not to be displayed in members list
                let imageUser = (
                    <Thumbnail
                        style={styles.groupMember}
                        key={counter}
                        source={{ uri: getProfileImg(user.profile) }}
                    />
                );
                arrayGroupImage.push(imageUser);
            }
            counter++;
        }
        let countExtraMember = "";
        if (loopLength > 3) {
            countExtraMember = group._team.users.length - 3;
        }
        return (
            <View style={{ paddingHorizontal: 8 }} key={group._id}>
                <TouchableOpacity
                    onPress={() => this.addUserToTeam(group._team._id, group._id)}
                >
                    <View style={[styles.taskItem]}>
                        <View style={[styles.taskItemHeader]}>
                            <View style={{ flexDirection: 'row' }}>
                                {imageUser}
                                <Text style={styles.taskItemName}>{userName} | {groupName}</Text>
                                <Text style={styles.taskItemXP}>{minutes}</Text>
                            </View>
                            <Text style={[styles.taskItemSize, { marginTop: 10 }]}>
                                {userStory && userStory.quota ? `${teamLength}/${userStory && userStory.maxnum}` : ""}
                            </Text>
                        </View>
                        <View style={styles.taskItemFooter}>
                            <View style={styles.viewShowMember}>
                                {arrayGroupImage}
                                {countExtraMember > 0 && (
                                    <View style={styles.plusMemberView}>
                                        <Text style={styles.plusTxt}>+{countExtraMember}</Text>
                                    </View>
                                )}
                            </View>
                            <Text
                                style={{
                                    ...styles.likeModalAction,
                                    ...{
                                        backgroundColor: "#1FBEB8",
                                        color: "#FFFFFF",
                                        overflow: 'hidden'
                                    }
                                }}
                            >
                                Join Story
                            </Text>

                        </View>
                    </View>
                </TouchableOpacity>
            </View>
        );
    };

    constructor(props) {
        super(props);
        this.state = {
            challengesFetching: true,
            challengesAndStories: [],
            currentSlideIndex: 0,
            modalVisible: false,
            processing: false,
            tasksFetching: false,
            userTaskGroups: [],
            numberOfLines: 2,
            imageBaseUrl: '',
            item: {},
            joinModal: false,
            count: {},
            storyItemTextStyle: styles.storyItemImage,
            animatedStyle: [],
            animatedHeight: new Animated.Value(styles.storyItemImage.height),
            isStoryLocked: false,
            currentGroupPageNumber: 1,
            totalUserTaskGroups: 0,
            firstY: 0,
            showQRScanModal: false,
            qrCodeScanned: ''
        };
        this.loadStoriesAndRefreshTask = this.loadStoriesAndRefreshTask.bind(this);
        this.onCloseQRScanModal = this.onCloseQRScanModal.bind(this);
        this.onDetectQRcodeData = this.onDetectQRcodeData.bind(this);
    }

    onCloseQRScanModal() {
        this.setState({ showQRScanModal: false });
    }
    onShowQRScanModal = () => {
        scan = false
        this.setState({ showQRModal:true,showQRScanModal: true });
    }

    onDetectQRcodeData(QRCodeData) {
        if (scan == false) {
            this.setState({showQRModal:false,showQRScanModal:false})
            this.setState({qrCodeScanned: QRCodeData }, () => {
                this.setState({joinModal:true})
                this.onCloseQRScanModal();
                scan = true
            });
        }

    }

    refreshAppFromBackground() {
        //update the app with components needed after coming alive.
        console.log("APPSTATECHG storyview refreshAppFromBackground")
    }

    timeDifference(current, previous) {
        var msPerMinute = 60 * 1000;
        var msPerHour = msPerMinute * 60;
        var msPerDay = msPerHour * 24;
        var msPerMonth = msPerDay * 30;
        var msPerYear = msPerDay * 365;

        var elapsed = current - previous;
        if (elapsed < msPerMinute) {
            return Math.round(elapsed / 1000) + "sec ago";
        } else if (elapsed < msPerHour) {
            return Math.round(elapsed / msPerMinute) + "min ago";
        } else if (elapsed < msPerDay) {
            return Math.round(elapsed / msPerHour) + "h ago";
        } else if (elapsed < msPerMonth) {
            return Math.round(elapsed / msPerDay) + "d ago";
        } else if (elapsed < msPerYear) {
            return Math.round(elapsed / msPerMonth) + "mon ago";
        } else {
            return Math.round(elapsed / msPerYear) + "yrs ago";
        }
    }

    componentWillReceiveProps(nextProps) {
        if (
            nextProps.stories &&
            !_.isEqual(nextProps.stories, this.state.challengesAndStories)
        ) {
            let { user, world } = nextProps;

            this._loadStories(user, world.stories);
        }
    }


    /*Loads stories from REALMDB through the helper.
    The stories are additionally filtered via the filterStories method, a worldutil method.*/
    _loadStories = (user, stories) => {
        let heights = new Array(stories.length);
        heights.fill(new Animated.Value(styles.storyItemImage.height), 0);

        const filteredStories = filterStories(user);



        this.setState({
            challengesAndStories: filteredStories,
            animatedStyle: heights
        });

    };

    patchGroups = () => {
        if (!this.props.user.userTaskGroupIds) { return }

        if (this.props.user.userTaskGroupIds && this.props.user.userTaskGroupIds.length == 0) {
            return
        }

        let getGroupByUserData = grouputil.getUserTaskGroupsById(this.props.user.userTaskGroupIds);
        if (getGroupByUserData) {
            getGroupByUserData.forEach(async group => {
                if (!group._userStory) {
                    await patchUserStory(group._id);
                }

                if (group._userStory && !group._userStory._feid) { //the feid represents the front end ID and could be empty because it was only added at a later version
                    await patchFeid(group._id);
                }
            })
        }

    }

    refreshUserTask = () => {
        this.props.userActions.fetchUserProfile(this.props.user._id);
    }




    componentDidMount() {

        super.componentDidMount();


        let self = this;
        if (self.props.user) {
            if (getStories().length == 0) {
                self.props.userActions.quickLoginRequest(self.props.user._id, () => {

                    self.loadStoriesAndRefreshTask()

                });
            } else {
                self.loadStoriesAndRefreshTask()
            }
            patchPushToken(self.props.user, (userData) => {
                self.props.userActions.updateUserData(userData)
            });
        }
        this.patchGroups();

    }

    loadStoriesAndRefreshTask() {
        let user = this.props.user;
        this._loadStories(user, this.props.world.stories); //will load from realmdb via the utility
    }

    setModalVisible(visible, itemId, itemType, itemBonusSparks, maxnum = 0) {
        this.setState({
            modalVisible: visible,
            tasksFetching: !!itemId,
            userTaskGroups: []
        });
        selectedItemId = itemId;
        selectedItemType = itemType;
        selectedItemBonusSparks = itemBonusSparks;
        if (itemId) {
            // alert('9')
            this.fetchUserTaskGroupsBasedOnStory(itemId, maxnum);
        }
    }

    handleGroupPageIncrement() {

        this.setState({
            currentGroupPageNumber: this.state.currentGroupPageNumber + 1,
        }, () => {
            this.fetchUserTaskGroupsBasedOnStory(selectedItemId, 0);
        });
    }

    handleGroupPageDecrement() {
        if (this.state.currentGroupPageNumber <= 1) {
            return;
        }
        this.setState({
            currentGroupPageNumber: this.state.currentGroupPageNumber - 1,
        }, () => {
            this.fetchUserTaskGroupsBasedOnStory(selectedItemId, 0);
        });
    }







    shouldComponentUpdate(nextProps, nextState) {

        return (
            !_.isEqual(nextProps, this.props) || !_.isEqual(nextState, this.state)
        );
    }

    // TODO: We should define this outside view
    fetchUserTaskGroupsBasedOnStory(storyId, maxnum) {
        let endpoint = USER_TASK_GROUP_LIST_PATH_API.replace("{page}", this.state.currentGroupPageNumber);
        endpoint = endpoint.replace("{type}", selectedItemType);
        endpoint = endpoint.concat("&page_size=", 6);
        endpoint = endpoint.concat("&type_id=", storyId);
        endpoint = endpoint.concat("&user_email=", this.props.user.profile.email);
        endpoint = endpoint.concat("&filter_user=", true);
        //a user can be in multiple teams and the filter for company will be in effect for all teams
        endpoint = endpoint.concat('&_teams=', this.props.user._teams.map((team) => {
            return team._id
        }).join(','));
        endpoint = endpoint.concat('&filter_company=', true);
        instance
            .get(endpoint)
            .then(response => {
                if (response) {
                    let groupsize = response.data.length;

                    this.setState({
                        userTaskGroups: response.data,
                        tasksFetching: false,
                        totalUserTaskGroups: groupsize,
                    });

                }
            })
            .catch(error => {
                bugsnag.notify(error);
                this.setState({ tasksFetching: false });


            });
    }

    addUserToTeam(teamId, taskGroupId) {
        if (!this.state.processing) {
            this.setState({ processing: true });
            let data = {
                email: this.props.user.profile.email,
                taskGroupId,
                users: this.props.user._id,
                BonusSparks: selectedItemBonusSparks
            };
            this.setState({ joinModal:false });

            trackMixpanel('Joined a team');
            fetch(TEAM_UPDATE_API.replace('{}', teamId), { //Routes.put('/team/:id', TeamsController.update_team);
                method: 'PUT',
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(data)
            })
                .then(response => response.json())
                .then(response => {

                    this.setState({ modalVisible: false, processing: false,joinModal:false });
                    let _userTaskGroups = this.state.userTaskGroups;
                    // Added 1% to bonus spark while new user join
                    if (_userTaskGroups[0].leftBonusSparks === response.leftBonusSparks) {
                        response.leftBonusSparks = (selectedItemBonusSparks + selectedItemBonusSparks * 0.01 * response._team.emails.length).toFixed(2);
                    }

                    if (!response._team.conversation) { //may happen to deprecated groups
                        patchConversation(response);
                    }

                    if (this.props.user && response && response._team) {
                        getSocket().emit('client:message', {
                            msgId: getuuid(),
                            sender: this.props.user._id,
                            receiver: response._team._id,
                            chatType: 'GROUP_MESSAGE',
                            type: Constants.EVENT_TEAM_JOIN,
                            conversationId: response._team.conversation._id,
                            groupId: response._id,
                            time: new Date().toISOString(),
                            message: this.props.user.profile.firstName + ' joined the group',
                            isJoining: true,
                            userProfile: this.props.user
                        });
                    }
                    createUpdateGroup(response);
                    this.props.navigation.navigate("Chat", {
                        task_group_id: taskGroupId, //response._id,
                        taskUpdated: false,
                        taskGroup: response,
                        userTaskGroups: this.state.userTaskGroups // fetched from userTaskGroupWithMessages
                    });


                    //this.props.userActions.fetchUserProfile(this.props.user._id);
                    this.refreshUserTask()

                })
                .catch(error => {
                    this.setState({ processing: false,joinModal:false });
                    bugsnag.notify(error);
                });
        }
    }

    //create new team with group
    createNewTeamGroup() {

        if (!this.state.processing) {
            this.setState({ processing: true });
            const { profile } = this.props.user;
            let groupData = {
                type: selectedItemType,
                _typeObject: selectedItemId,
                _user: this.props.user._id,
                ...(selectedItemBonusSparks
                    ? {
                        leftBonusSparks: selectedItemBonusSparks,
                        lastBonusSparksRefreshed: new Date()
                    }
                    : {})
            };

            let data = {
                name: `${profile.firstName} - team`,
                emails: {
                    'accepted': true,
                    'email': profile.email
                },
                users: this.props.user._id,
                groupData: groupData
            };

            trackMixpanel('Create a new Team')
            instance.post(CREATE_TEAM_GROUP_API.replace('{}/', ''), data).then(response => {
                this.setState({ processing: false, modalVisible: false });
                selectedItemId = null;
                selectedItemType = null;


                createUpdateGroup(response.data);

                this.refreshUserTask()
                this.props.navigation.navigate("Chat", {
                    task_group_id: response.data._id,
                    taskUpdated: false,
                    taskGroup: response.data
                });
            }).catch((error) => {
                this.setState({ processing: false })
                bugsnag.notify(error)
            });
        }
    }

    /* called when a user clicks on "start one" in the modal.
    It calls an API to create the team, and then create a new group. This is a double API call we expect to fix */
    createNewTeam() {
        if (!this.state.processing) {
            this.setState({ processing: true });
            const { profile } = this.props.user;
            let data = {
                name: `${profile.firstName} - team`,
                emails: {
                    'accepted': true,
                    'email': profile.email
                },
                users: this.props.user._id
            };
            trackMixpanel('Create a Group')
            instance.post(TEAM_UPDATE_API.replace('{}/', ''), data).then(response => {
                this.createNewUserTaskGroup(response.data._id); // double API call
            }).catch((error) => {
                this.setState({ processing: false })
                bugsnag.notify(error)
            });
        }
    }

    createNewUserTaskGroup(teamId) {
        let data = {
            type: selectedItemType,
            _typeObject: selectedItemId,
            _user: this.props.user._id,
            _team: teamId,
            ...(selectedItemBonusSparks
                ? {
                    leftBonusSparks: selectedItemBonusSparks,
                    lastBonusSparksRefreshed: new Date()
                }
                : {})
        };
        fetch(SAVE_USER_TASK_GROUP_API, {
            method: "POST",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        })
            .then(response => response.json())
            .then((response = {}) => {
                this.setState({ processing: false, modalVisible: false });
                selectedItemId = null;
                selectedItemType = null;
                this.refreshUserTask()
                this.props.navigation.navigate("Chat", {
                    task_group_id: response._id,
                    taskUpdated: false,
                    taskGroup: response
                });
            })
            .catch(error => {
                bugsnag.notify(error);
                this.setState({ processing: false });
            });
    }

    //deprecated: to be updated. We currently dont need to filter by achievements yet.
    getChallengesAndStories(user, userAchievements) {
        let { profile } = user;
        if (profile) {
            let data = {
                emailId: profile.email,
                userId: user._id,
                achievementIds: this.getUserAchievementIds(userAchievements)
            };
            this.props.storyActions.getStoriesRequest(data);
        }
    }

    //deprecated: to be updated. We currently dont need to filter by achievements yet.
    getUserAchievementIds(userAchievements) {
        return userAchievements
            .filter(item => item.status === "Complete")
            .map(item => item.achievementId);
    }

    onRequestCloseModal() {
        this.setModalVisible(!this.state.modalVisible);
        this.setState({
            currentGroupPageNumber: 1,
            totalUserTaskGroups: 0,
        });
    }

    errorImg = (index) => {
        let count = { ...this.state.count };
        count[index] = count[index] || 0;
        count[index] = false;
        this.setState({ count });
    }

    imgLoaded = (index) => {
        let count = { ...this.state.count };
        count[index] = count[index] || 0;
        count[index] = true;
        this.setState({ count });
    }

    renderAbstractOrDescription = (item) => {
        if (this.state.morePressed) {
            return item.description
        } else {
            if (item.abstract) {
                return item.abstract.substring(0, 240)
            } else {
                return item.description.substring(0, 240)
            }
        }
    }


    calculateDateConstraints(startDate, expNo) {
        // returns everything in time primitives (milliseconds)
        let now = new Date().getTime();
        let unlock = new Date(startDate).getTime();
        let expiry = new Date(startDate).getTime() + expNo * 24 * 60 * 60 * 1000;
        return { now, unlock, expiry };
    }

    _onHandlerStateChange = (event) => {
        if (this.state.firstY = 0) {
            this.setState({ firstY: event.nativeEvent.translationY })
        }
        if (event.nativeEvent.oldState === State.ACTIVE) {
            if (event.nativeEvent.translationY > this.state.firstY) {
                this.onRequestCloseModal()
            }
        }

    }

    render() {
        //const isMysterious = this.state.item.category == 'The Mysterious  Artifact' ? true : false;

        const { challengesAndStories } = this.state;

        return (
            <SafeAreaView style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', width: '90%', alignSelf: "center", alignItems: 'center', justifyContent: 'space-between', marginTop: 15 }}>
                    <View style={{ flexDirection: 'row', width: '55%', justifyContent: 'space-between', alignItems: 'flex-end', alignSelf: "flex-end" }}>
                        <FastImage
                            source={require('../images/Soqqle.png')}
                            style={{ height: width / 4.5 / 3.4, width: width / 4.5 }}
                            resizeMode={FastImage.resizeMode.contain}
                        />
                        <FastImage
                            source={require('../images/Avatar.png')}
                            style={{ height: height * 3.8 / 100, width: width * 9.4 / 100, }}
                            resizeMode={FastImage.resizeMode.contain}
                        />
                    </View>
                    <View style={{ flexDirection: 'row' }}>
                        <TouchableOpacity style={{ height: 25, width: 30, right: 45, alignItems: "center" }} onPress={() => this.onShowQRScanModal()}>
                            <FastImage
                                source={require('../images/scan.png')}
                                style={{ height: 17, width: 17 }}
                                resizeMode={FastImage.resizeMode.contain}

                            />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => this.goToDashboardScreen()}>
                            <FastImage
                                source={require('../images/menu.png')}
                                style={{ height: 17, width: 17, right: 15 }}
                                resizeMode={FastImage.resizeMode.contain}
                            />
                        </TouchableOpacity>
                    </View>
                </View>
                <View style={{ alignSelf: "center", width: '90%', marginTop: 35, flexDirection: "row" }}>
                    <Text style={{ fontFamily: 'Gilroy-Medium', alignSelf: 'flex-start', fontSize: hp('3%'), color: '#4F4F4F' }}>
                        {'Discover' + ' '}
                    </Text>
                    <Text style={{ fontFamily: 'Gilroy-Light', alignSelf: 'flex-start', fontSize: hp('3%'), color: '#4F4F4F' }}>
                        new adventures
                    </Text>
                </View>
                <View style={{ alignSelf: "center", width: '90%', marginTop: 8 }}>
                    <Text style={{ fontFamily: 'Gilroy-Light', alignSelf: 'flex-start', fontSize: hp('1.9%'), color: '#9A9A9A' }}>
                        Join a group or create one.
                    </Text>
                </View>
                <FlatList
                    style={{ marginTop: hp('1%') }}
                    scrollEnabled={challengesAndStories.length > 1 ? true : false}
                    extraData={this.state.count && this.state.count}
                    data={challengesAndStories}
                    keyExtractor={item => item.id}
                    renderItem={({ item, index }) => {
                        let image = item.imagesUrl[0];
                        console.log("imageerror to be displayed ", item.imagesUrl[0])

                        return (
                            <TouchableOpacity onPress={() => { this.itemPressed(item._id, item.type, item.bonusSparks, item.maxnum || 0), this.setState({ item: item, image: image }) }}>
                                <View key={index} style={{
                                    alignSelf: "center", alignItems: 'center', width: '94%', height: challengesAndStories.length > 1 ? hp('28%') : hp('68%'), borderRadius: 20, marginBottom: index == challengesAndStories.length - 1 ? hp('10%') : 0, marginTop: hp('2.5%'), shadowOffset: { width: 0, height: 5, },
                                    shadowColor: 'rgba(0, 0, 0, 0.1)',
                                    shadowOpacity: 0.5,
                                    elevation: 10
                                }}>
                                    <FastImage
                                        borderRadius={20}
                                        onLoad={() => this.imgLoaded(item._id)}
                                        onError={() => this.errorImg(item._id)}
                                        source={
                                            image ? {uri: image}
                                                : require("../images/image.png")
                                        }

                                        style={{ width: '100%', height: challengesAndStories.length > 1 ? hp('28%') : hp('68%') }}
                                        resizeMode={FastImage.resizeMode.cover}
                                        priority={FastImage.priority.high}
                                    >
                                        <View style={{ position: 'absolute', justifyContent: 'center', alignItems: 'center', height: hp('7.4'), alignSelf: 'center', borderTopLeftRadius: 20, borderTopRightRadius: 20, width: '85%', backgroundColor: '#fff', bottom: 0 }}>
                                            <Text style={{ fontFamily: 'Gilroy-Bold', marginTop: hp('1.4%'), fontSize: hp('2.8%'), color: '#3C1464' }}>
                                                {item.name}
                                            </Text>
                                        </View>
                                    </FastImage>
                                </View>
                            </TouchableOpacity>
                        )
                    }
                    }
                />
                <View style={{
                    height: hp('7%'),
                    flexDirection: 'row', alignItems: 'center',
                    justifyContent: 'space-evenly',
                    position: 'absolute', width: '100%',
                    shadowOffset: { width: 0, height: -4, },
                    shadowColor: 'rgba(0, 0, 0, 0.25)',
                    shadowOpacity: 0.8,
                    elevation: 15,
                    backgroundColor: '#FFF', bottom: 0
                }}>
                    <TouchableOpacity onPress={() => this.goToProfileScreen()}>
                        <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}>
                            <FastImage
                                source={require('../images/Group.png')}
                                style={{ height: 17, width: 17 }}
                                resizeMode={FastImage.resizeMode.contain}

                            />
                            <Text style={{ fontFamily: 'Gilroy-Regular', marginTop: hp('0.5%'), fontSize: hp('2%'), color: '#3C1464', marginLeft: hp('1.5%') }}>
                                Dashboard
                        </Text>
                        </View>
                    </TouchableOpacity>
                    {this.props.user.userTaskGroupIds.length > 0 && <FastImage
                        source={require('../images/Vector.png')}
                        resizeMode={FastImage.resizeMode.contain}
                        style={{
                            height: 30, width: 25,
                        }}
                    />}
                    {this.props.user.userTaskGroupIds.length > 0 && <TouchableOpacity onPress={() => this.goToUserTasksScreen()}>
                        <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', alignContent: "center" }}>
                            <FastImage
                                source={require('../images/Group13.png')}
                                resizeMode={FastImage.resizeMode.contain}
                                style={{ height: 20, width: 20 }}

                            />
                            <Text style={{ fontFamily: 'Gilroy-Regular', fontSize: hp('2%'), marginTop: hp('0.5%'), color: '#3C1464', marginLeft: hp('1.5%') }}>
                                Groups
                        </Text>
                        </View>
                    </TouchableOpacity>}
                </View>
                <Modal
                    animationInTiming={1000}
                    animationType={"slide"}
                    useNativeDriver={true}
                    propagateSwipe={true}
                    swipeDirection={'down'}
                    transparent={true}
                    visible={this.state.modalVisible}
                    style={[styles.modalContent, { justifyContent: "flex-end", margin: 0 }]}
                    onRequestClose={this.onRequestCloseModal.bind(this)}
                    onBackdropPress={this.onRequestCloseModal.bind(this)}
                    onSwipeComplete={this.onRequestCloseModal.bind(this)}
                >
                    <View style={styles.likeModalView}>
                        <View style={this.state.item.type === TASK_GROUP_TYPES.CHALLENGE ? styles.challengeContainer : [styles.storyContainer, { width: '100%' }]}>

                            <View >
                                <FastImage
                                    source={{ uri: this.state.image }}
                                    style={[this.state.storyItemTextStyle, {
                                        height: hp('48%'),
                                        borderBottomRightRadius: width * 11 / 100,
                                        borderBottomLeftRadius: width * 11 / 100,
                                        overflow: 'hidden'
                                    }]}
                                    resizeMode={FastImage.resizeMode.cover}
                                >

                                    <LinearGradient
                                        colors={['rgba(75, 23, 141, 0)', 'rgba(75, 23, 141, 0)', 'rgba(75, 23, 141, 0.6)', 'rgba(75, 23, 141,0.8)']}
                                        style={{
                                            height: hp('53%'),
                                            width: '100%',
                                            zIndex: 2,
                                            borderBottomRightRadius: width * 11 / 100,
                                            borderBottomLeftRadius: width * 11 / 100,
                                            backgroundColor: 'transparent',
                                            shadowOffset: { width: 10, height: 10, },
                                            shadowColor: 'rgba(61,21,100,0)',
                                            shadowOpacity: 1.0,
                                            justifyContent: 'flex-end',
                                        }}>
                                        <Text numberOfLines={4} style={styles.titleText}>
                                            {this.state.item.name}
                                        </Text>
                                    </LinearGradient>

                                </FastImage>
                                <View style={styles.imageContainer}>
                                    {path > 0 && <View style={styles.storyTagImageContainer}>
                                        <FastImage style={styles.storyTagImage}
                                            source={require('../images/VerifedIcon.png')}
                                            resizeMode={FastImage.resizeMode.cover}
                                        />
                                        <Text style={styles.quotaTag}>
                                            {this.state.item.quota + ' paths' || 0}
                                        </Text>
                                    </View>}
                                    {this.state.item.reward && (
                                        <View style={[styles.storyTagImageContainer, { marginLeft: hp('7%') }]}>
                                            <FastImage style={styles.storyTagImage}
                                                source={require('../images/PlanIcon.png')}
                                                resizeMode={FastImage.resizeMode.contain}
                                            />
                                            <Text style={{ ...styles.quotaTag }}>
                                                {`${this.state.item.reward.value || 0}`}
                                            </Text>
                                        </View>
                                    )}
                                </View>
                                {this.state.item.type === TASK_GROUP_TYPES.STORY ? (
                                    <View style={[this.state.storyContent, { paddingVertical: 0, backgroundColor: 'white', marginTop: hp('2.5%') }]}>
                                        <View style={{ flexWrap: 'wrap', alignSelf: 'center' }}>
                                            <View style={{ marginLeft: hp('3%'), marginRight: hp('3%') }}>
                                                {
                                                    this.state.morePressed ?
                                                        <Text style={[styles.storyItemText, { color: '#4F4F4F', fontSize: wp('3.8%'), letterSpacing: -0.7, fontFamily: 'Gilroy-Regular', textAlign: 'justify' }]}>{this.renderAbstractOrDescription(this.state.item)} </Text> :
                                                        <Text numberOfLines={4} style={[styles.storyItemText, { color: '#4F4F4F', textAlign: 'justify', fontSize: wp('3.8%'), letterSpacing: -0.7, fontFamily: 'Gilroy-Regular' }]}>{this.renderAbstractOrDescription(this.state.item) + '... '}</Text>
                                                }
                                            </View>
                                            <TouchableOpacity onPress={() => this.onMorePressed()} activeOpacity={0.9} >
                                                {this.state.morePressed ?
                                                    <Text style={[styles.showOrLess, { marginLeft: hp('1%'), paddingLeft: 15, paddingRight: 15, color: '#4F4F4F', fontSize: wp('3.8%'), fontFamily: 'Gilroy-Regular', textAlign: 'justify', }]}
                                                    >
                                                        less
                         </Text>
                                                    :
                                                    <Text
                                                        style={[styles.showOrLess, { marginLeft: hp('1%'), paddingLeft: 15, paddingRight: 15, color: '#4F4F4F', fontSize: wp('3.8%'), fontWeight: '600', fontFamily: 'Gilroy-Regular', }]}>Read more</Text>}
                                            </TouchableOpacity>
                                        </View>

                                    </View>
                                ) : (
                                        <View style={this.state.storyContent}>
                                            <Text
                                                style={styles.challengeItemTitle}
                                                numberOfLines={1}
                                            >
                                                {this.state.item.name}
                                            </Text>
                                            <Text
                                                style={styles.challengeItemText}
                                                numberOfLines={4}
                                            >
                                                {this.state.item.description}
                                            </Text>
                                        </View>
                                    )}

                                <TouchableOpacity
                                    style={{
                                        top: hp('2%'),
                                        right: hp('1%'),
                                        height: height * 4.2 / 100,
                                        width: width * 9.2 / 100,
                                        marginLeft: wp('4%'),
                                        zIndex: 2
                                    }}
                                    activeOpacity={0.9}
                                    onPress={() => this.createNewTeamGroup()}>
                                    <FastImage
                                        style={{ height: height * 4.2 / 100, width: width * 9.2 / 100 }}
                                        resizeMode={FastImage.resizeMode.contain}
                                        source={require('../images/plus2.png')}
                                    />
                                </TouchableOpacity>

                                {this.state.processing ? (
                                    <View style={styles.listLoader}>
                                        <ActivityIndicator size="large" color="#120B34" />
                                    </View>
                                ) : null}

                                {this.state.userTaskGroups.length > 0 &&

                                    <ScrollView
                                        directionalLockEnabled={false}
                                        horizontal={true}
                                        keyboardShouldPersistTaps={true}
                                        style={{ zIndex: -9999 }}
                                        showsHorizontalScrollIndicator={false}
                                        contentContainerStyle={{ marginLeft: wp('6%'), flexDirection: 'row', flexGrow: 1 }}>
                                        {
                                            this.state.userTaskGroups.map((item, index) => {

                                                return (
                                                    <TouchableWithoutFeedback style={{
                                                        position: 'relative',
                                                    }}>
                                                        <TouchableOpacity activeOpacity={0.9} onPress={() => { this.addUserToTeam(item._team._id, item._id) }}>

                                                            <View style={{
                                                                height: height * 15 / 100,
                                                                width: width * 25 / 100,
                                                                backgroundColor: '#3C1464',
                                                                paddingVertical: hp('1%'),
                                                                // paddingHorizontal: hp('1%'),
                                                                // justifyContent:'center',
                                                                alignItems: 'center',
                                                                marginRight: hp('2%'),
                                                                borderRadius: 10,
                                                            }}>
                                                                <Text style={{ textAlign: 'center', fontSize: hp('1.78%'), color: 'white', fontFamily: 'Gilroy-Bold' }}>{item._user.profile.firstName}</Text>
                                                                <Text style={{ textAlign: 'center', paddingLeft: 10, paddingRight: 10, fontSize: hp('1.74%'), color: 'white', marginTop: hp('1%'), fontFamily: 'Gilroy-Light' }}>{'Team -'}{item.name}</Text>
                                                            </View>
                                                        </TouchableOpacity>

                                                    </TouchableWithoutFeedback>
                                                )
                                            })
                                        }
                                        {/* <FlatList
                // data={this.state.userTaskGroups}
                data={[{name:'dfsddhgfhg'},{name:'fghh'}, {name:'fgfgh'},{name:'gfdsfh'},{name:'hggdj'}]}
                horizontal={true}
                style={{flexDirection:'row'}}
                extraData={this.state.userTaskGroups}
                renderItem={({item,index})=>this.ongroupView(item, index)}
                >
                </FlatList> */}

                                    </ScrollView>

                                }
                            </View>
                        </View>
                    </View>
                </Modal>
                <Modal
                    visible={this.state.joinModal}
                    transparent={true}
                    style={[styles.modalContent, { justifyContent: "center", margin: 0,backgroundColor:'rgba(100,100,100, 0.8)' }]}
                >
                    <View style={styles.joinModalMainView}>
                        <TouchableOpacity
                        onPress={()=>this.setState({joinModal:false})}
                        style={ styles.joinModalCloseIcon }>
                        <FastImage
                            source={require('../images/closeIcon.png')}
                            style={{ height: 15, width: 15,alignSelf:'flex-end' }}
                            resizeMode={FastImage.resizeMode.contain}
                        />
                        </TouchableOpacity>
                        <View style={{ width: '82%' }}>
                            <Text style={styles.joimModalTitle}>
                                {this.state.qrCodeScanned && this.state.qrCodeScanned.data ? this.state.qrCodeScanned.data.name : ''}
                            </Text>
                            <Text style={styles.joinModalDesText}>
                            {this.state.qrCodeScanned && this.state.qrCodeScanned.data ? this.state.qrCodeScanned.data._userStory.description : ''}
                            </Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: hp('1.5%') }}>
                                <FastImage
                                    source={require('../images/Group5.png')}
                                    style={{ height: 15, width: 15, right: 3, }}
                                    resizeMode={FastImage.resizeMode.contain}
                                />
                                <Text style={styles.teamLengthText}>
                                {this.state.qrCodeScanned && this.state.qrCodeScanned.data ? this.state.qrCodeScanned.data._team.users.length +'/'+this.state.qrCodeScanned.data._userStory.maxnum : '4/5'}
                            </Text>
                            </View>
                            <TouchableOpacity onPress={()=>this.addUserToTeam(this.state.qrCodeScanned.data._team._id,this.state.qrCodeScanned.data._userStory.taskGroup._id)} style={{ width: '100%',marginBottom:15, alignSelf: 'center', justifyContent: 'center', alignItems: 'center', backgroundColor: '#3C1464', height: 30, borderRadius: 30, marginTop: hp('2.8%') }}>
                                <Text style={styles.joinButtonText}>
                                    JOIN
                            </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>
             <QRScanModal
                    modalVisible={this.state.showQRScanModal}
                    onRequestClose={this.onCloseQRScanModal}
                    onQRcodeDetect={this.onDetectQRcodeData} />
            </SafeAreaView>
        );
    }
}

// export default codePush(codePushOptions)(StoryView)
export default StoryView;
