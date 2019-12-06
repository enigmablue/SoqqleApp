import React, { Component } from "react";
import { View, Modal, TouchableOpacity, Text, SafeAreaView } from "react-native";
import styles from "../stylesheets/QRCodeViewStyles";
import Icon from "react-native-vector-icons/FontAwesome";
import { RNCamera } from 'react-native-camera';
import {API_BASE_URL} from "../config";
import * as axios from 'axios';
const instance = axios.create({
    baseURL: API_BASE_URL,
    timeout: 25000,
    headers: {'Content-type': 'application/json'}
});

export default class QRScanModal extends Component {

  onBarCodeRead=(scanResult)=>{
    console.log("onBarCodeRead start")
    console.log(scanResult.type);
    console.log(scanResult.data);
    if (scanResult.data != null) {
      console.log('onBarCodeRead call', scanResult.data);
      instance.get(`${API_BASE_URL}/getGroupWithMessage?_id=${scanResult.data}`)
          .then((response) => {
            console.log("onBarCodeRead response ", response)
            this.props.onQRcodeDetect(response);

          })
    }
    return;
  }

  render() {
    const {
      modalVisible,
      onRequestClose,
    } = this.props;

    return (
      <Modal
        hardwareAccelerated
        animationType='slide'
        transparent={false}
        visible={modalVisible}
        onRequestClose={onRequestClose}
      >
        <SafeAreaView style={styles.fullcontentContainer}>
            <View style={styles.fullcontentContainer}>
                <View style={styles.headerTopView}>
                    <Text style={styles.modalHeaderTitleStyle}> Scan QRCode </Text>
                    <TouchableOpacity
                        style={styles.fulliconcontainer}
                        onPress={onRequestClose}>
                        <Icon name="close" color='white' style={styles.closeIcon} />
                    </TouchableOpacity>
                </View>
           <RNCamera
						ref={(ref) => {
							this.camera = ref;
						}}
						style={{flex:1, width: '100%'}}
						type={RNCamera.Constants.Type.back}
						flashMode={RNCamera.Constants.FlashMode.off}
						androidCameraPermissionOptions={{
							title: 'Permission to use camera',
							message: 'We need your permission to use your camera',
							buttonPositive: 'Ok',
							buttonNegative: 'Cancel'
						}}
						androidRecordAudioPermissionOptions={{
							title: 'Permission to use audio recording',
							message: 'We need your permission to use your audio',
							buttonPositive: 'Ok',
							buttonNegative: 'Cancel'
              }}
              onBarCodeRead={this.onBarCodeRead}
            />
            </View>
        </SafeAreaView>
      </Modal>
    );
  }
}
