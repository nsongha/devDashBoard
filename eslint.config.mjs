import js from '@eslint/js';

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        // Node.js globals
        console: 'readonly',
        process: 'readonly',
        URL: 'readonly',
        Buffer: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        // Node 18+ built-in Web APIs
        fetch: 'readonly',
        AbortController: 'readonly',
        Headers: 'readonly',
        Response: 'readonly',
        Request: 'readonly',
        Map: 'readonly',
        Date: 'readonly',
        Promise: 'readonly',
        Math: 'readonly',
        JSON: 'readonly',
        parseInt: 'readonly',
        parseFloat: 'readonly',
        isNaN: 'readonly',
        Error: 'readonly',
        Object: 'readonly',
        Array: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-console': 'off',
      'prefer-const': 'error',
      'no-var': 'error',
      eqeqeq: ['error', 'always'],
    },
  },
  {
    ignores: ['node_modules/', 'public/', '*.json'],
  },
];
