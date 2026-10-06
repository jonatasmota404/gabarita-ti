import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

// SWC para preservar os metadados de decorators (injeção de dependência do Nest).
// Os projetos abaixo herdam o plugin desta config.
export default defineConfig({
  plugins: [swc.vite({ module: { type: 'es6' } })],
  test: {
    projects: [
      {
        test: { name: 'unit', include: ['src/**/*.spec.ts'] },
      },
      {
        test: {
          name: 'integracao',
          include: ['test/**/*.spec.ts'],
          globalSetup: ['test/setup-global.ts'],
          // Os arquivos compartilham os bancos de teste.
          fileParallelism: false,
          testTimeout: 20_000,
          hookTimeout: 60_000,
        },
      },
    ],
  },
});
