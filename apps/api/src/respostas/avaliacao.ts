// Regras de pontuação. Fonte da verdade: `gabarito_status` do contrato do ingest.
// Só `ok` pontua; anulada, sem_gabarito, inconsistente e qualquer valor novo/desconhecido
// NUNCA contam como acerto nem como erro. `resposta_correta` só é considerada com status ok.

export const GABARITO_OK = 'ok';

export interface GabaritoVigente {
  tipoItem: string;
  gabaritoStatus: string;
  respostaCorreta: string | null;
}

export interface Avaliacao {
  pontuavel: boolean;
  /** null quando não pontuável. */
  correta: boolean | null;
  /** Gabarito que pode ser mostrado ao usuário (null se não pontuável). */
  respostaCorreta: string | null;
}

export function ehPontuavel(g: Pick<GabaritoVigente, 'gabaritoStatus' | 'respostaCorreta'>) {
  return g.gabaritoStatus === GABARITO_OK && !!g.respostaCorreta?.trim();
}

export function normalizarLetra(letra: string) {
  return letra.trim().toUpperCase();
}

export function avaliar(g: GabaritoVigente, resposta: string): Avaliacao {
  if (!ehPontuavel(g)) return { pontuavel: false, correta: null, respostaCorreta: null };
  const correta = normalizarLetra(g.respostaCorreta!);
  return {
    pontuavel: true,
    correta: normalizarLetra(resposta) === correta,
    respostaCorreta: correta,
  };
}

/**
 * Letras aceitas como resposta. A letra é sempre interpretada pelo tipo_item: em
 * certo_errado `C`/`E` são Certo/Errado; em múltipla escolha são alternativas.
 * Tipo de item desconhecido: nenhuma opção (o app não sabe como responder).
 */
export function opcoesResposta(tipoItem: string, letrasAlternativas: string[]): string[] {
  if (tipoItem === 'certo_errado') return ['C', 'E'];
  if (tipoItem === 'multipla_escolha') {
    return [...new Set(letrasAlternativas.map(normalizarLetra))].sort();
  }
  return [];
}
