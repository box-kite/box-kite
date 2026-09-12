import js from '@eslint/js';
import importPlugin from 'eslint-plugin-import-x';
import prettierPlugin from 'eslint-plugin-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  // Build output, ours and Next's: `.next/types/**` and `next-env.d.ts` are generated files the
  // Next.js example rewrites on every build.
  { ignores: ['dist', 'dist-core', 'dist-bridge', '**/.next/**', '**/next-env.d.ts'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      'import-x': importPlugin,
      prettier: prettierPlugin,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // `semantic` and `svgElement` are component factories — the rule cannot see through a call
      // that returns a component, and would read a file of twenty of them as a file of constants.
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true, extraHOCs: ['semantic', 'svgElement', 'withAttributesInProps'] },
      ],
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-namespace': 'off',
      'no-unused-expressions': 'off',
      '@typescript-eslint/no-unused-expressions': [
        'error',
        {
          allowShortCircuit: true,
          allowTernary: true,
          allowTaggedTemplates: true,
        },
      ],
      'import-x/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
          'newlines-between': 'never',
          alphabetize: {
            order: 'asc',
            caseInsensitive: true,
          },
        },
      ],
      'no-unreachable': 'warn',
      'prettier/prettier': 'error',
    },
  },
  {
    // The styling engine is the future `@box-kite/core` package: framework-free by construction.
    // React belongs in the adapter (`src/react/**`) — see CONTRIBUTING.md, "The core boundary".
    // `npm run check:boundaries` enforces the same rule outside ESLint (JSX, React globals).
    files: ['src/core.ts', 'src/core/**/*.{ts,tsx}'],
    ignores: ['**/*.test.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'react', message: 'src/core must stay framework-free — put React code in src/react/.' },
            { name: 'react-dom', message: 'src/core must stay framework-free — put React code in src/react/.' },
          ],
          patterns: ['react/*', 'react-dom/*'],
        },
      ],
    },
  },
  {
    // The prerender entry renders the site rather than being part of it: it exports the function the
    // build calls, and fast refresh never applies to it.
    files: ['pages/entry-server.tsx'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
  {
    // The one module that ships a component and an API together, and has to: `toast()` is callable from
    // anywhere at all, which is the whole point of it, and splitting it into a second entry would make a
    // consumer import two modules to use one feature.
    files: ['src/components/toaster.tsx'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
  {
    // The Next.js example is not a Vite app: Next's own convention is a route file exporting both a
    // component and its metadata, which is exactly what this rule exists to prevent elsewhere.
    files: ['examples/next-app/**/*.tsx'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
  {
    // The DataGrid engine must stay headless (framework-agnostic): no React, no DOM.
    // Rendering/adapter logic belongs in the components layer.
    files: ['src/components/dataGrid/models/**/*.ts'],
    ignores: ['**/*.test.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'react', message: 'DataGrid models must stay headless — keep React in the components/adapter layer.' },
            { name: 'react-dom', message: 'DataGrid models must stay headless — keep React in the components/adapter layer.' },
          ],
          patterns: ['react/*', 'react-dom/*'],
        },
      ],
    },
  },
);
