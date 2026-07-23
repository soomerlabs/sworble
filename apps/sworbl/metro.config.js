// Metro config: default Expo config + .txt as a bundlable ASSET — the full
// 135k dictionary ships inside the app (native: bundled file; web: emitted as
// a separate fetchable asset, NOT parsed into the JS bundle).
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
config.resolver.assetExts.push('txt');

module.exports = config;
