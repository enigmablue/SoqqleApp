import React from 'react';
import {Container, Text, List, ListItem,Content, Separator, Left, Body} from 'native-base';
import {TouchableOpacity, Image} from 'react-native'

import I18n from '../utils/localize'

import styles from './../stylesheets/SideBarMenuStyles';

const SidebarMenu = ({goUserListView , logout, goExportView})=>{

    return (
        <Container style={styles.container}>
            <Content>
                <List>
                    <ListItem>

                        <Body>
                            <Text style={styles.item}>Settings</Text>
                        </Body>
                    </ListItem>
                    <Separator/>
                    <ListItem button onPress={()=>goExportView()}>
                        <Left>
                            <Image
                                style={{ height: 20, width: 20, }}
                                source={require('../images/Export.png')}
                            />
                        </Left>
                        <Body>
                            <Text style={styles.item}>{I18n.t("export")}</Text>
                        </Body>
                    </ListItem>
                    <ListItem>
                        <Left>
                            <Image
                                style={{ height: 20, width: 20, }}
                                source={require('../images/Feedback.png')}
                            />

                        </Left>
                        <Body>
                            <Text style={styles.item}>{I18n.t("sendFeedback")}</Text>
                        </Body>
                    </ListItem>
                    <ListItem >
                        <Left>
                            <Image
                                style={{ height: 20, width: 20, }}
                                source={require('../images/question-mark.png')}
                            />

                        </Left>
                        <Body>
                        <Text style={styles.item}>{I18n.t("FAQ")}</Text>
                        </Body>
                    </ListItem>
                    <ListItem button onPress={()=>goUserListView()}>
                        <Left>
                            <Image
                                style={{ height: 20, width: 20, }}
                                source={require('../images/Block.png')}
                            />

                        </Left>
                        <Body>
                            <Text style={styles.item}>{I18n.t("blocked")}</Text>
                        </Body>
                    </ListItem>
                    <ListItem button onPress={()=>logout()}>
                        <Left>
                            <Image
                                style={{ height: 20, width: 20, }}
                                source={require('../images/LogoutPurple.png')}
                            />
                        </Left>
                        <Body>
                            <Text style={styles.item}>{I18n.t("logout")}</Text>
                        </Body>
                    </ListItem>

                </List>
            </Content>
        </Container>
    )

}


export default SidebarMenu
