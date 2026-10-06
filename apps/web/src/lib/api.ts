'use client';

export class ErroApi extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

function mensagem(dados: unknown, status: number) {
  const m = (dados as { message?: unknown } | null)?.message;
  if (Array.isArray(m)) return m.join('. ');
  if (typeof m === 'string') return m;
  return status >= 500 ? 'Algo deu errado. Tente de novo.' : 'Não foi possível concluir.';
}

/** Chama o BFF (/api/*). Em 401 manda para o login, preservando a página atual. */
export async function api<T>(caminho: string, init?: RequestInit): Promise<T> {
  let resposta: Response;
  try {
    resposta = await fetch(`/api/${caminho.replace(/^\/+/, '')}`, {
      ...init,
      headers: { 'content-type': 'application/json', ...init?.headers },
    });
  } catch {
    throw new ErroApi(0, 'Sem conexão. Verifique a internet e tente de novo.');
  }
  if (resposta.status === 401 && !caminho.startsWith('sessao')) {
    const volta = window.location.pathname + window.location.search;
    // Fora de componente (sem router) e queremos recarregar tudo sem estado antigo.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign(`/entrar?volta=${encodeURIComponent(volta)}`);
    throw new ErroApi(401, 'Sessão expirada');
  }
  if (resposta.status === 204) return undefined as T;
  const dados = await resposta.json().catch(() => null);
  if (!resposta.ok) throw new ErroApi(resposta.status, mensagem(dados, resposta.status));
  return dados as T;
}

/** URL de imagem servida pela API, passando pelo BFF (mesma origem, cookie de sessão). */
export const urlRecorte = (url: string) => `/api${url}`;
