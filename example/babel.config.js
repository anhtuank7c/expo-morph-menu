module.exports = (api) => {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // Reanimated 4 dùng plugin của worklets. Luôn để cuối danh sách plugins.
    plugins: ['react-native-worklets/plugin'],
  };
};
