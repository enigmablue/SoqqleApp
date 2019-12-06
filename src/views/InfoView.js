import React, {Component, Fragment} from 'react';
import {
    Image,
    Text,
    View,
    SafeAreaView,
    ImageBackground,
    Platform,
    Dimensions,
    ScrollView,
} from "react-native";
import Header from '../components/Header';
import styles from "../stylesheets/InfoViewStyles";
import {widthPercentageToDP as wp} from 'react-native-responsive-screen';
import {heightPercentageToDP as hp} from "react-native-responsive-screen";
import {Thumbnail} from "native-base";
import {STORY_IMAGE_BASE_URL} from '../constants';
import FastImage from 'react-native-fast-image';
import QRCodeModal from "../components/QRCodeModal";

import { getProfileImg} from '../utils/common';

const deviceWidth = Dimensions.get('window').width;
const {height} = Dimensions.get('window');

const fontFamilyName = Platform.OS === 'ios' ? "SFUIDisplay-Regular" : "SF-UI-Display-Regular";


export default class InfoView extends Component {

    constructor(props) {
        super(props);
        const {navigation} = props;
        const taskGroupData = navigation.getParam('taskGroup', "No Data")
        this.state = {
            taskGroupData: taskGroupData, //naming problem - its a group not taskgroup
            showQRCodeView: false
        };
        this.onCloseQRCodeView = this.onCloseQRCodeView.bind(this);
    }

    onCloseQRCodeView() {
        this.setState({ showQRCodeView: false });
    }
    onShowQRCodeView = () => {
        this.setState({ showQRCodeView: true });
    }

    render() {
        const {taskGroupData} = this.state;
        const ImageBaseUri = STORY_IMAGE_BASE_URL;
        const story = taskGroupData._userStory;
        let group = taskGroupData;
        if (!story.reward) // just in case the reward value is not copied over correctly from story to userStory - especially during the progression. Refer to RealmHelper - setUserStory
        {
          story.reward.type="";
          story.reward.value=0;
        }

        let image1, image2, countExtraMember;
        if (group._team && group._team.users){
          countExtraMember = group._team.users.length - 2;
          // Now showing photos
          if (group._team.users.length > 0) {
              let user = group._team.users [0];
              const uri = getProfileImg (user.profile);
              image1 = <Thumbnail
                  style={styles.member1}
                  source={{uri: uri }}/>;
          }
          if (group._team.users.length > 1) {
              let user = group._team.users [1];
              const uri = getProfileImg (user.profile);
              image2 = <Thumbnail
                  style={styles.member2}
                  source={{uri: uri }}/>;
          }
        }

        return (

            <Fragment>
                <ScrollView>
                    <ImageBackground source={require('../images/backblue.png')} style={styles.imageBgContainer}>
                        <SafeAreaView style={{flex: 0, backgroundColor: "transparent"}}>
                            <Header
                                navigation={this.props.navigation}
                                style={{justifyContent: 'center'}}
                                title={story.name}
                                headerStyle={styles.headerStyle}
                                fontStyle={styles.fontStyle}
                                headerTitleStyle={styles.headerTitleStyle}
                                headerRightTextStyle={styles.headerRightTextStyle}
                                TaskGroupData={group}
                                ShowQRIcon={true}
                                onRight={this.onShowQRCodeView}
                            />
                        </SafeAreaView>
                    </ImageBackground>
                    <SafeAreaView>
                        <View>
                            <FastImage
                              source={{uri: ImageBaseUri.replace('{}', story._id)}}
                              style={styles.storyImageContainer}
                              resizeMode={FastImage.resizeMode.contain}
                              />
                        </View>

                        <View style={styles.StoryDetailsContainer}>
                            <View style={{padding: 20}}>
                                <Text style={styles.storyTitleStyle}>
                                    {story.name}
                                </Text>
                                <Text style={styles.storyDiscriptionStyle}>
                                    {
                                        story.description
                                    }
                                </Text>
                            </View>
                            <View style={styles.roundImageContainer}>
                                <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
                                    <View style={{flexDirection: 'row'}}>
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
                                    <View style={{flexDirection: 'row', marginTop: 5}}>
                                        <Image source={require("../images/Sparks_Icon.png")}
                                               style={styles.SparkImageStyle}/>
                                        <Text
                                            style={styles.sparkTextStyle}>{`${story.reward.value || ''} ${story.reward.type} `}</Text>
                                    </View>
                                </View>
                            </View>
                        </View>
                        <View style={styles.nextSequenceContainer}>
                            <Image source={require('../images/Swipe.png')} style={styles.swipeImageStyle}/>
                            <View style={{flexDirection: 'row', marginTop: 34, justifyContent: 'center'}}>
                                <View style={styles.rectangleStyle}>
                                    <Text style={styles.rectangleTextStyle}>The Robot Takeover is already here</Text>
                                </View>
                                <View style={{...styles.rectangleStyle, marginLeft: 18}}>
                                    <Text style={styles.rectangleTextStyle}>Human 'employment' and the economy</Text>
                                </View>
                            </View>
                        </View>
                    </SafeAreaView>
                    <QRCodeModal
                        modalVisible={this.state.showQRCodeView}
                        onRequestClose={this.onCloseQRCodeView}
                        taskGroupId={taskGroupData._id}/>
                </ScrollView>
            </Fragment>
        )
    }

}
