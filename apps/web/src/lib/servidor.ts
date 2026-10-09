import 'server-only';

/** Cookie httpOnly com o JWT da API. O JavaScript do navegador nunca vê o token. */
export const COOKIE_SESSAO = 'gabarita_sessao';
const SETE_DIAS = 60 * 60 * 24 * 7;

/** Mesma variável da API (lida do .env da raiz). Sem ela, vale o modo seguro: jwt. */
export function modoLocal() {
  return process.env.AUTH_MODE === 'local';
}

export function apiUrl(caminho: string) {
  const base = process.env.API_URL ?? 'http://localhost:3001';
  return new URL(caminho.replace(/^\/+/, ''), base.endsWith('/') ? base : `${base}/`);
}

export const opcoesCookie = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: SETE_DIAS,
};

/** Bloqueia requisições que mudam estado vindas de outra origem (CSRF). */
export function origemValida(req: Request) {
  if (req.method === 'GET' || req.method === 'HEAD') return true;
  const origem = req.headers.get('origin');
  if (!origem) return false;
  return new URL(origem).host === new URL(req.url).host;
}

export function erroJson(status: number, message: string) {
  return Response.json({ statusCode: status, message }, { status });
}
