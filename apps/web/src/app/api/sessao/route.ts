import { cookies } from 'next/headers';
import type { Sessao } from '@gabarita/shared';
import { COOKIE_SESSAO, apiUrl, erroJson, opcoesCookie, origemValida } from '@/lib/servidor';

/** Entrar ou criar conta: chama a API e guarda o JWT em cookie httpOnly. */
export async function POST(req: Request) {
  if (!origemValida(req)) return erroJson(403, 'Origem não permitida');
  const corpo = (await req.json().catch(() => null)) as {
    modo?: string;
    email?: string;
    senha?: string;
    nome?: string;
  } | null;
  if (!corpo || (corpo.modo !== 'entrar' && corpo.modo !== 'cadastro')) {
    return erroJson(400, 'Requisição inválida');
  }
  const { modo, ...credenciais } = corpo;
  let resposta: Response;
  try {
    resposta = await fetch(apiUrl(`/auth/${modo}`), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(credenciais),
      cache: 'no-store',
    });
  } catch {
    return erroJson(502, 'Serviço indisponível. Tente de novo em instantes.');
  }
  const dados = await resposta.json().catch(() => ({}));
  if (!resposta.ok) return Response.json(dados, { status: resposta.status });

  const { token, usuario } = dados as Sessao;
  (await cookies()).set(COOKIE_SESSAO, token, opcoesCookie);
  return Response.json({ usuario });
}

export async function GET() {
  const token = (await cookies()).get(COOKIE_SESSAO)?.value;
  if (!token) return erroJson(401, 'Sem sessão');
  const resposta = await fetch(apiUrl('/auth/eu'), {
    headers: { authorization: `Bearer ${token}` },
    cache: 'no-store',
  }).catch(() => null);
  if (!resposta) return erroJson(502, 'Serviço indisponível');
  return new Response(resposta.body, {
    status: resposta.status,
    headers: { 'content-type': 'application/json' },
  });
}

export async function DELETE(req: Request) {
  if (!origemValida(req)) return erroJson(403, 'Origem não permitida');
  (await cookies()).delete(COOKIE_SESSAO);
  return new Response(null, { status: 204 });
}
