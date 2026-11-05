module.exports = function (api) {
  api.cache(true);
  // babel-preset-expo adds the react-native-reanimated plugin by itself
  return { presets: ['babel-preset-expo'] };
};
