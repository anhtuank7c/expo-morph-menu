/**
 * app.json plus one switch: EXPO_BASE_URL serves the web build from a sub
 * path (the documentation site embeds it from /expo-morph-menu/playground-social).
 */
module.exports = ({ config }) => ({
  ...config,
  experiments: {
    ...config.experiments,
    ...(process.env.EXPO_BASE_URL ? { baseUrl: process.env.EXPO_BASE_URL } : {}),
  },
});
