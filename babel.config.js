module.exports = {
  presets: ['module:@react-native/babel-preset'],
  // Reanimated v4 moved its worklets engine out into react-native-worklets;
  // this must be listed last per the library's docs.
  plugins: ['react-native-worklets/plugin'],
};
