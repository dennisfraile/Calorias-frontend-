module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // Reanimated 4 ships its Babel plugin via react-native-worklets.
    // It MUST be the last plugin in the list. (mythik-react-native depends on
    // reanimated/worklets for native motion.)
    plugins: ['react-native-worklets/plugin'],
  };
};
