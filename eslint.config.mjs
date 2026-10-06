import js from '@eslint/js';
import nextVitals from 'eslint-config-next/core-web-vitals';
import prettier from 'eslint-config-prettier';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const webFiles = ['apps/web/**/*.{ts,tsx,js,mjs}'];

export default defineConfig([
  globalIgnores([
    '**/node_modules/**',
    '**/dist/**',
    '**/.next/**',
    '**/coverage/**',
    '**/next-env.d.ts',
    'apps/api/src/generated/**',
  ]),
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', destructuredArrayIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
    },
  },
  {
    files: ['apps/api/**/*.ts'],
    rules: {
      // Nest injeta por tipo de classe: o import precisa existir em runtime.
      '@typescript-eslint/consistent-type-imports': 'off',
    },
  },
  {
    files: ['apps/api/**/*.ts', 'packages/**/*.ts', 'scripts/**/*.mjs', '*.mjs'],
    languageOptions: { globals: { ...globals.node } },
  },
  {
    files: ['apps/web/public/sw.js'],
    languageOptions: { globals: { ...globals.serviceworker } },
  },
  // A config do Next (parser e plugins React/Next) vale só para o app web.
  ...nextVitals.map((c) =>
    Object.keys(c).length === 1 && c.ignores ? c : { ...c, files: webFiles },
  ),
  {
    files: webFiles,
    settings: { next: { rootDir: 'apps/web' }, react: { version: '19' } },
    rules: {
      // Só App Router: não há diretório pages/.
      '@next/next/no-html-link-for-pages': 'off',
    },
  },
  prettier,
]);
