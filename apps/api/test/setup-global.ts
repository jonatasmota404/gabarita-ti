import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ADMIN_URL, APP_URL, BANCO_APP, comCliente, recriarIngest } from './bancos.js';

/**
 * Prepara bancos descartáveis no Postgres local (docker compose): o banco do app com as
 * migrações Prisma e uma fixture do ingest com as views do contrato. Nunca toca no banco
 * real de ingestão.
 */
export default async function setup() {
  try {
    await comCliente(ADMIN_URL, async (c) => {
      await c.query(`DROP DATABASE IF EXISTS ${BANCO_APP} WITH (FORCE)`);
      await c.query(`CREATE DATABASE ${BANCO_APP}`);
    });
  } catch (err) {
    throw new Error(
      `Postgres de teste indisponível em ${new URL(ADMIN_URL).host}. Rode "pnpm db:up". (${(err as Error).message})`,
      { cause: err },
    );
  }
  const apiDir = join(dirname(fileURLToPath(import.meta.url)), '..');
  execFileSync('pnpm', ['exec', 'prisma', 'migrate', 'deploy'], {
    cwd: apiDir,
    env: { ...process.env, DATABASE_URL: APP_URL },
    stdio: 'pipe',
  });
  await recriarIngest();
}
