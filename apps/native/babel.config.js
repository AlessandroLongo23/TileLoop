module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      // babel-preset-expo auto-adds the react-native-reanimated/plugin when
      // reanimated is installed, so we do not list it manually.
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
  };
};
