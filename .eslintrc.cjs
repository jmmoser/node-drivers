module.exports = {
  env: {
    es2021: true,
    node: true,
  },
  extends: [
    'airbnb-base',
  ],
  parserOptions: {
    ecmaVersion: 12,
    // ecmaVersion: 2020,
    sourceType: 'module',
    // es2020: true,
  },
  rules: {
    'import/extensions': ['error', 'always'],
    'import/prefer-default-export': 'off',

    'no-console': 'off',
    'no-plusplus': 'off',
    // 'no-underscore-dangle': ['error', { allowAfterThis: true }],
    'no-underscore-dangle': 'off',
    // 'no-param-reassign': ['error', { props: false }],
    'no-param-reassign': 'off',
    'no-bitwise': 'off',
    'prefer-rest-params': 'off',
    'max-classes-per-file': 'off',
  },
};
