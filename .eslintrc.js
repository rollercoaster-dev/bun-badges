module.exports = {
  parser: '@typescript-eslint/parser',
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier',
  ],
  plugins: ['@typescript-eslint', 'unused-imports'],
  rules: {
    // Change "unexpected any" from warning to error
    '@typescript-eslint/no-explicit-any': 'error',
    
    // Change "no console" from warning to error
    'no-console': 'error',
    
    // Keep other rules as they are
    'unused-imports/no-unused-imports': 'error',
    'unused-imports/no-unused-vars': [
      'warn',
      {
        vars: 'all',
        varsIgnorePattern: '^_',
        args: 'after-used',
        argsIgnorePattern: '^_',
      },
    ],
  },
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
  },
  env: {
    node: true,
    es6: true,
  },
  ignorePatterns: ['dist', 'node_modules', '*.js'],
};
