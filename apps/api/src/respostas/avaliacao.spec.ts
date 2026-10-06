import { describe, expect, it } from 'vitest';
import { avaliar, ehPontuavel, opcoesResposta } from './avaliacao.js';

const me = (gabaritoStatus: string, respostaCorreta: string | null) => ({
  tipoItem: 'multipla_escolha',
  gabaritoStatus,
  respostaCorreta,
});

describe('avaliar', () => {
  it('pontua acerto e erro só com gabarito_status ok', () => {
    expect(avaliar(me('ok', 'B'), 'B')).toEqual({
      pontuavel: true,
      correta: true,
      respostaCorreta: 'B',
    });
    expect(avaliar(me('ok', 'B'), 'a')).toEqual({
      pontuavel: true,
      correta: false,
      respostaCorreta: 'B',
    });
  });

  it.each(['anulada', 'sem_gabarito', 'inconsistente', 'status_novo_desconhecido'])(
    '%s nunca conta como acerto nem como erro',
    (status) => {
      expect(avaliar(me(status, null), 'A')).toEqual({
        pontuavel: false,
        correta: null,
        respostaCorreta: null,
      });
    },
  );

  it('ignora resposta_correta quando o status não é ok', () => {
    // O contrato diz que vem nula; mesmo que viesse preenchida, não vale.
    expect(avaliar(me('anulada', 'A'), 'A')).toMatchObject({ pontuavel: false, correta: null });
  });

  it('status ok sem resposta_correta não pontua (defensivo)', () => {
    expect(ehPontuavel({ gabaritoStatus: 'ok', respostaCorreta: null })).toBe(false);
  });

  it('interpreta C/E pelo tipo_item em certo/errado', () => {
    const ce = { tipoItem: 'certo_errado', gabaritoStatus: 'ok', respostaCorreta: 'E' };
    expect(avaliar(ce, 'E').correta).toBe(true);
    expect(avaliar(ce, 'C').correta).toBe(false);
  });
});

describe('opcoesResposta', () => {
  it('certo/errado aceita só C e E, independentemente de alternativas', () => {
    expect(opcoesResposta('certo_errado', ['A', 'B'])).toEqual(['C', 'E']);
  });
  it('múltipla escolha aceita as letras das alternativas', () => {
    expect(opcoesResposta('multipla_escolha', ['b', 'A', 'D', 'C'])).toEqual(['A', 'B', 'C', 'D']);
  });
  it('tipo de item desconhecido não tem opções', () => {
    expect(opcoesResposta('discursiva', [])).toEqual([]);
  });
});
