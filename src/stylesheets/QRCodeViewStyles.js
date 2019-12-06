import { StyleSheet, Platform } from "react-native";
const fontFamilyName = Platform.OS === 'ios' ? 'SFUIDisplay-Regular' : 'SF-UI-Display-Regular'

export default StyleSheet.create({
  contentContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.8)"
  },
  fullcontentContainer: {
    flex: 1,
    backgroundColor: "white"
  },
  headerTopView:{
    flexDirection:"row",
    height: 30
  },
  container: {
    backgroundColor: "#fff",
    padding: 10,
    overflow: "visible",
    alignItems: "center",
    justifyContent: "center",
    zIndex:999
  },
  modalHeaderTitleStyle: {
    flex:1,
    fontFamily: fontFamilyName,
    fontSize: 20,
    textAlign: 'center',
    color: '#3C1364'
  },
  iconContainer: {
    width: 28,
    height: 28,
    right: -15,
    top:-12,
    alignSelf:'flex-end',
    alignItems:'center',
    justifyContent: "center",
    position:'absolute',
    borderWidth:1,
    borderRadius:20,
    borderColor:'transparent',
    backgroundColor:'gray'
  },
  fulliconcontainer: {
    width: 28,
    height: 28,
    right: 8,
    bottom:1,
    alignSelf:'flex-end',
    alignItems:'center',
    justifyContent: "center",
    borderRadius:20,
    backgroundColor:'gray'
  },
  closeIcon: {
    fontSize: 20
  }
});