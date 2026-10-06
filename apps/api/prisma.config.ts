import { config } from 'dotenv';
import { defineConfig } from 'prisma/config';

// O .env fica na raiz do monorepo; variáveis já exportadas no ambiente têm precedência.
config({ path: '../../.env', quiet: true });

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: { url: process.env.DATABASE_URL ?? '' },
});
