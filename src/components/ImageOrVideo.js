import React from "react";
import {Dimensions,View,Text} from 'react-native';
import FastImage from 'react-native-fast-image';
import Video from "react-native-gifted-chat/node_modules/react-native-video";
let {height,width} = Dimensions.get('window')

const ImageOrVideo = (props) =>{
    if(props.type == "video"){
        return(
            <View>
            <Video source={props.source}   // Can be a URL or a local file.
          ref={(ref) => {
            this.player = ref
          }}                                      // Store reference
                     // Callback when video cannot be loaded
          fullscreen={false}
          resizeMode={"cover"}
          muted={true}
          rate={1.0}
          controls={false}
          repeat={true}
          ignoreSilentSwitch={"obey"}
          style={{height: height,width :width, position: "absolute",
          top: 0,
          left: 0,
          alignItems: "stretch",
        //   zIndex: 10,
          bottom: 0,
          right: 0}} >
           

              </Video>
                
        <View style={{height: height,width :width,}}>
            {props.children}
        </View> 
        </View>
        )
    }else{
        return(<FastImage
            style={props.style}
            source={props.source}
            >
                {props.children}
            </FastImage>)
        
    }
   
}

export default ImageOrVideo;