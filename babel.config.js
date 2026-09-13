module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
    // expo-router/babel ya viene incluido en babel-preset-expo (SDK 50+).
    // Sin worklets en el MVP: no hace falta el plugin de reanimated.
  };
};
