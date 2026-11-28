// ESLint config for the package (src/) and both example apps.
//
// The rule set aims at mistakes that fail at runtime rather than at style:
// unhandled promises, broken hook calls, missing switch cases, imports that do
// not resolve. Formatting is left to Prettier (eslint-config-prettier turns off
// the rules that would conflict with it).

const { defineConfig, globalIgnores } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettierConfig = require('eslint-config-prettier/flat');

module.exports = defineConfig([
  globalIgnores([
    '**/node_modules/',
    '**/.expo/',
    '**/dist/',
    '**/web-build/',
    'lib/',
    'example-social/test/.build/',
    'docs/',
    // The documentation site, with its own package and tooling.
    'website/',
    '**/expo-env.d.ts',
  ]),

  expoConfig,

  // Type-aware rules. They need type information, so they only run on files
  // covered by a tsconfig (the package and the two apps).
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: __dirname,
      },
    },
    settings: {
      'import/resolver': {
        typescript: { project: ['tsconfig.json', 'example/tsconfig.json', 'example-social/tsconfig.json'] },
      },
    },
    rules: {
      // A promise nobody awaits or catches swallows its error.
      '@typescript-eslint/no-floating-promises': 'error',
      // An async function passed where a void callback is expected (onPress,
      // useEffect) loses its rejection.
      '@typescript-eslint/no-misused-promises': ['error', { checksVoidReturn: { attributes: false } }],
      '@typescript-eslint/await-thenable': 'error',
      // A new value in a union type must be handled by every switch over it.
      '@typescript-eslint/switch-exhaustiveness-check': [
        'error',
        { considerDefaultExhaustiveForUnions: true },
      ],
      '@typescript-eslint/no-unnecessary-type-assertion': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },

  {
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',
      // Reanimated shared values are written through `.value` by design. This
      // React Compiler rule reports every such write as mutating a hook result.
      'react-hooks/immutability': 'off',
      'import/no-cycle': 'error',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'smart'],
    },
  },

  // Node scripts and config files.
  {
    files: ['**/*.config.js', '**/scripts/**', '**/test/**/*.cjs'],
    languageOptions: {
      globals: { require: 'readonly', module: 'writable', __dirname: 'readonly', process: 'readonly' },
    },
    rules: { 'no-console': 'off' },
  },

  prettierConfig,
]);
