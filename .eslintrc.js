module.exports = {
  env: {
    commonjs: true,
    es2021: true,
    node: true,
  },
  extends: [
    'airbnb-base',
  ],
  parserOptions: {
    ecmaVersion: 12,
  },
  rules: {
    strict: 'off',
    'no-plusplus': 'off',
    // 'no-underscore-dangle': ['error', { allowAfterThis: true }],
    'no-underscore-dangle': 'off',
    'no-param-reassign': ['error', { props: false }],
    'no-bitwise': 'off',
  },
};
