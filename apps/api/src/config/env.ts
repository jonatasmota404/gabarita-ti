import { isAbsolute, resolve } from 'node:path';

export interface Env {
  PORT: number;
  DATABASE_URL: string;
  INGEST_DATABASE_URL: string;
  /** Sempre absoluto (relativos são resolvidos a partir do cwd da API). */
  RECORTES_DIR: string;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  CORS_ORIGINS: string[];
}

const obrigatorias = ['DATABASE_URL', 'INGEST_DATABASE_URL', 'RECORTES_DIR', 'JWT_SECRET'] as const;

/** Valida as variáveis de ambiente na subida (falha cedo, com mensagem clara). */
export function validarEnv(bruto: Record<string, unknown>): Env {
  const faltando = obrigatorias.filter((k) => !String(bruto[k] ?? '').trim());
  if (faltando.length) {
    throw new Error(`Variáveis de ambiente ausentes: ${faltando.join(', ')} (veja .env.example)`);
  }
  const jwtSecret = String(bruto.JWT_SECRET);
  if (jwtSecret.length < 32) {
    throw new Error('JWT_SECRET precisa ter pelo menos 32 caracteres');
  }
  const recortes = String(bruto.RECORTES_DIR);
  return {
    PORT: Number(bruto.PORT ?? 3001),
    DATABASE_URL: String(bruto.DATABASE_URL),
    INGEST_DATABASE_URL: String(bruto.INGEST_DATABASE_URL),
    RECORTES_DIR: isAbsolute(recortes) ? recortes : resolve(process.cwd(), recortes),
    JWT_SECRET: jwtSecret,
    JWT_EXPIRES_IN: String(bruto.JWT_EXPIRES_IN ?? '7d'),
    CORS_ORIGINS: String(bruto.CORS_ORIGINS ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  };
}
