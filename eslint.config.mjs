import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import nextVitals from 'eslint-config-next/core-web-vitals';

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/.next/**',
      '**/dist/**',
      'public/**',
      'apps/web/next-env.d.ts',
      'apps/kids/next-env.d.ts',
      'packages/db/migrations/**',
      'packages/db-kids/migrations/**',
      'loadtest/**',
      'docs/producao/referencias/**',
      '**/playwright-report/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    extends: [...nextVitals],
    settings: { next: { rootDir: 'apps/web' } },
  },
  {
    files: ['apps/kids/**/*.{ts,tsx}'],
    extends: [...nextVitals],
    settings: { next: { rootDir: 'apps/kids' } },
  },
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
);
