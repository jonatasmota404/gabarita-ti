import { cookies } from 'next/headers';
import { COOKIE_SESSAO, apiUrl, erroJson, modoLocal, origemValida } from '@/lib/servidor';

// BFF: repassa /api/* para a API Nest anexando o JWT do cookie. Só as rotas que o web usa.
const PERMITIDAS = [/^questoes(\/.*)?$/, /^desempenho$/, /^historico$/];
const CABECALHOS_REPASSADOS = ['content-type', 'cache-control', 'content-length', 'etag'];

async function repassar(req: Request, ctx: { params: Promise<{ caminho: string[] }> }) {
  const caminho = (await ctx.params).caminho.map(encodeURIComponent).join('/');
  if (!PERMITIDAS.some((re) => re.test(caminho))) return erroJson(404, 'Não encontrado');
  if (!origemValida(req)) return erroJson(403, 'Origem não permitida');

  // Modo local: a API resolve o usuário fixo e não pede token nem cookie.
  const token = modoLocal() ? undefined : (await cookies()).get(COOKIE_SESSAO)?.value;
  if (!token && !modoLocal()) return erroJson(401, 'Sessão expirada');

  const destino = apiUrl(caminho);
  destino.search = new URL(req.url).search;
  let resposta: Response;
  try {
    resposta = await fetch(destino, {
      method: req.method,
      headers: {
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...(req.method === 'POST' ? { 'content-type': 'application/json' } : {}),
      },
      body: req.method === 'POST' ? await req.text() : undefined,
      cache: 'no-store',
    });
  } catch {
    return erroJson(502, 'Serviço indisponível. Tente de novo em instantes.');
  }

  const headers = new Headers();
  for (const nome of CABECALHOS_REPASSADOS) {
    const valor = resposta.headers.get(nome);
    if (valor) headers.set(nome, valor);
  }
  if (!headers.has('cache-control')) headers.set('cache-control', 'no-store');
  return new Response(resposta.body, { status: resposta.status, headers });
}

export { repassar as GET, repassar as POST };
