/**
 * App ví dụ dùng `expo-morph-menu` từ mã nguồn ở thư mục cha (../src), và
 * dùng chung node_modules của thư mục cha. KHÔNG `npm install` trong example/:
 * hai bản react / reanimated là lỗi khó hiểu đầu tiên bạn sẽ gặp.
 */
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const root = path.resolve(__dirname, '..');
const config = getDefaultConfig(__dirname);

config.watchFolders = [root];
config.resolver.nodeModulesPaths = [path.resolve(root, 'node_modules')];
config.resolver.extraNodeModules = { 'expo-morph-menu': root };

module.exports = config;
