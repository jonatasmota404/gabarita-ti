import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';
import pg from 'pg';

config({ path: join(dirname(fileURLToPath(import.meta.url)), '../../../.env'), quiet: true });

export const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '../../..');
export const FIXTURE_DIR = join(RAIZ, 'infra/ingest-fixture');

/** Conexão administrativa (superusuário do Postgres local do docker compose). */
export const ADMIN_URL =
  process.env.TEST_ADMIN_DATABASE_URL ?? 'postgresql://gabarita:gabarita@localhost:5436/postgres';

export const BANCO_APP = 'gabarita_test';
export const BANCO_INGEST = 'gabarita_ingest_test';
export const LEITOR = 'gabarita_leitor_test';
export const SENHA_LEITOR = 'leitor-de-teste';

function urlCom(banco: string, credenciais?: { usuario: string; senha: string }) {
  const url = new URL(ADMIN_URL);
  url.pathname = `/${banco}`;
  if (credenciais) {
    url.username = credenciais.usuario;
    url.password = credenciais.senha;
  }
  return url.toString();
}

export const APP_URL = urlCom(BANCO_APP);
/** Admin no banco da fixture (para os testes manipularem as tabelas fx_*). */
export const INGEST_ADMIN_URL = urlCom(BANCO_INGEST);
/** O que a API usa: role somente leitura com SELECT só nas views v_*. */
export const INGEST_LEITOR_URL = urlCom(BANCO_INGEST, { usuario: LEITOR, senha: SENHA_LEITOR });

export async function comCliente<T>(url: string, fn: (c: pg.Client) => Promise<T>) {
  const cliente = new pg.Client({ connectionString: url });
  await cliente.connect();
  try {
    return await fn(cliente);
  } finally {
    await cliente.end();
  }
}

/** Recria o banco da fixture do ingest do zero (contrato v1 + exemplos + role leitor). */
export async function recriarIngest() {
  await comCliente(ADMIN_URL, async (c) => {
    await c.query(`DROP DATABASE IF EXISTS ${BANCO_INGEST} WITH (FORCE)`);
    await c.query(`CREATE DATABASE ${BANCO_INGEST}`);
    const existe = await c.query('SELECT 1 FROM pg_roles WHERE rolname = $1', [LEITOR]);
    if (!existe.rowCount) await c.query(`CREATE ROLE ${LEITOR} LOGIN`);
    await c.query(`ALTER ROLE ${LEITOR} WITH LOGIN PASSWORD '${SENHA_LEITOR}'`);
    await c.query(`ALTER ROLE ${LEITOR} SET default_transaction_read_only = on`);
  });
  await comCliente(INGEST_ADMIN_URL, async (c) => {
    await c.query(await readFile(join(FIXTURE_DIR, 'contrato-v1.sql'), 'utf8'));
    await c.query(await readFile(join(FIXTURE_DIR, 'seed-exemplo.sql'), 'utf8'));
    await c.query(`REVOKE ALL ON ALL TABLES IN SCHEMA public FROM ${LEITOR}`);
    await c.query(`GRANT SELECT ON v_questao_estudo, v_questao_alternativa, v_questao_topico,
      v_questao_tecnologia, v_questao_recorte TO ${LEITOR}`);
  });
}
