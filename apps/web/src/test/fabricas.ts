import type { QuestaoDetalhe, Recorte, ResultadoResposta } from '@gabarita/shared';

export const recorte = (p: Partial<Recorte> = {}): Recorte => ({
  recorteId: 1,
  origem: 'questao',
  letraAlternativa: null,
  tipo: 'figura',
  pagina: 1,
  ordem: 1,
  url: `/questoes/1/recortes/${p.recorteId ?? 1}`,
  ...p,
});

export const questaoME = (p: Partial<QuestaoDetalhe> = {}): QuestaoDetalhe => ({
  questaoId: 101,
  provaId: 10,
  banca: 'cesgranrio',
  orgao: 'Petrobras',
  ano: 2023,
  cargo: 'Analista de Sistemas',
  numero: 31,
  tipoItem: 'multipla_escolha',
  gabaritoStatus: 'ok',
  gabaritoVersao: 'definitivo',
  classificada: true,
  temRecorte: false,
  areaProva: null,
  tipoCaderno: null,
  enunciado: 'Uma relação está na 3FN quando',
  textoApoio: null,
  tipoCobranca: null,
  nivelCognitivo: null,
  normaReferencia: null,
  alternativas: ['A', 'B', 'C', 'D', 'E'].map((letra) => ({ letra, texto: `opção ${letra}` })),
  opcoesResposta: ['A', 'B', 'C', 'D', 'E'],
  pontuavel: true,
  topicos: [],
  tecnologias: [],
  recortes: [],
  ...p,
});

export const questaoCE = (p: Partial<QuestaoDetalhe> = {}): QuestaoDetalhe =>
  questaoME({
    questaoId: 206,
    banca: 'cebraspe',
    tipoItem: 'certo_errado',
    enunciado: 'O TLS 1.3 mantém compatibilidade total com o TLS 1.0.',
    alternativas: [],
    opcoesResposta: ['C', 'E'],
    ...p,
  });

export const resultado = (p: Partial<ResultadoResposta> = {}): ResultadoResposta => ({
  respostaId: 'r1',
  questaoId: 101,
  resposta: 'A',
  pontuavel: true,
  correta: false,
  gabaritoStatus: 'ok',
  respostaCorreta: 'B',
  gabaritoVersao: 'definitivo',
  respondidaEm: '2026-10-06T12:00:00.000Z',
  ...p,
});
