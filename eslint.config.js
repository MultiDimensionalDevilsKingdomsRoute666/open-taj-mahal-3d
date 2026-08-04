import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist', 'node_modules'] },
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
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      // React Compiler's immutability rule assumes render output is pure data.
      // react-three-fiber is the opposite: every frame mutates geometries,
      // materials, matrices and instance buffers in place, because allocating
      // new ones sixty times a second is the thing you must never do. The rule
      // flags that idiom throughout and cannot be satisfied without making the
      // renderer allocate per frame, so it is off for this project.
      'react-hooks/immutability': 'off',
    },
  },
)
