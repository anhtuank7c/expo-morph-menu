/**
 * The example app uses `expo-morph-menu` from the source in the parent folder
 * (../src) and shares the parent's node_modules. Do not run `npm install` in
 * example/: two copies of react or reanimated cause hard-to-trace errors.
 */
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const root = path.resolve(__dirname, '..');
const config = getDefaultConfig(__dirname);

config.watchFolders = [root];
config.resolver.nodeModulesPaths = [path.resolve(root, 'node_modules')];
config.resolver.extraNodeModules = { 'expo-morph-menu': root };

module.exports = config;
