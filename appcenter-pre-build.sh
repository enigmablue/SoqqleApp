npm install -g react-native-cli
rm -rf /Users/runner/runners/Developer/Xcode/DerivedData

rm -rf $APPCENTER_SOURCE_DIRECTORY/ios/Pods
cd $APPCENTER_SOURCE_DIRECTORY/ios
pod install
cd ..
react-native bundle --platform android --dev false --entry-file index.js --bundle-output android/app/src/main/assets/index.android.bundle
