// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Fix for react-native-svg web bundling issue:
// "Unable to resolve ./web/WebShape from elements.web.js"
// Metro needs to be able to resolve bare sub-path imports inside node_modules
// on the web platform. Enabling sourceExts to include the .js files that
// react-native-svg exposes through its web-specific entry points.
config.resolver.unstable_enablePackageExports = true;

module.exports = config;
