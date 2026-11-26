module.exports = (api) => {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // Reanimated 4 uses the worklets plugin. Keep it last in the plugin list.
    plugins: ['react-native-worklets/plugin'],
  };
};
