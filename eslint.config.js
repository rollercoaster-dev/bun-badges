import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import eslintConfigPrettier from 'eslint-config-prettier';
import unusedImports from 'eslint-plugin-unused-imports';

export default [
  {
    ignores: ['dist/**', 'node_modules/**'],
  },
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 'latest',
         sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      'unused-imports': unusedImports,
    },
    rules: {
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'warn',
        {
          'vars': 'all',
          'varsIgnorePattern': '^_',
          'args': 'after-used',
          'argsIgnorePattern': '^_'
        }
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      'no-console': 'error',
      'no-debugger': 'warn',
    },
  },
  {
    files: [
      '**/*.test.ts',             // Unit test files
      '**/*.integration.test.ts', // Integration test files
      'tests/**/*',               // All files under the tests/ directory (helpers, setup, e2e)
      '**/src/utils/test/**/*.ts', // Test utilities under src/utils/test
      '**/src/utils/logger.ts'    // Logger implementation
    ],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      'unused-imports': unusedImports,
    },
    rules: {
      'no-console': 'off', // Allow console logs in tests and logger
      '@typescript-eslint/no-explicit-any': 'off', // Allow 'any' type in tests for flexibility
      'unused-imports/no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
  {
    files: ['**/src/db/schema/**/*.ts'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      'unused-imports': unusedImports,
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  {
    files: ['**/src/db/migrations/**/*.ts'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      'unused-imports': unusedImports,
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      'no-console': 'off', // Migrations often need to log information
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
  eslintConfigPrettier,
];
