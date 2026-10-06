// Contrato HTTP da API do Gabarita TI (JSON). Usado pelo web e por futuros clientes nativos.
// Os campos espelham o contrato de leitura do ingest (provas-ti-ingest/docs/contrato-app.md),
// em camelCase. Enums-texto do ingest podem ganhar valores novos: por isso `(string & {})`.

export type TipoItem = 'multipla_escolha' | 'certo_errado' | (string & {});

/** Só `ok` permite pontuar. Qualquer outro valor (inclusive desconhecido) não pontua. */
export type GabaritoStatus = 'ok' | 'anulada' | 'sem_gabarito' | 'inconsistente' | (string & {});

export type GabaritoVersao = 'definitivo' | 'preliminar' | (string & {});

export interface Pagina<T> {
  itens: T[];
  pagina: number;
  porPagina: number;
  total: number;
}

export interface Usuario {
  id: string;
  email: string;
  nome: string | null;
}

export interface Sessao {
  token: string;
  usuario: Usuario;
}

export interface Topico {
  areaId: number;
  area: string;
  topicoId: number;
  topico: string;
  principal: boolean;
  confianca: number | null;
}

export interface Tecnologia {
  tecnologiaId: number;
  tecnologia: string;
  categoria: string;
  confianca: number | null;
}

export interface Recorte {
  recorteId: number;
  /** `apoio` (do texto de apoio) ou `questao` (do enunciado/alternativas). */
  origem: string;
  /** Letra da alternativa em que aparece; null = enunciado ou texto de apoio. */
  letraAlternativa: string | null;
  /** `figura`, `tabela`, `codigo`, `formula`... */
  tipo: string;
  pagina: number;
  ordem: number;
  /** Caminho da imagem na API, relativo à raiz dela. */
  url: string;
}

export interface Alternativa {
  letra: string;
  texto: string;
}

export interface QuestaoResumo {
  questaoId: number;
  banca: string;
  orgao: string;
  ano: number | null;
  cargo: string;
  numero: number;
  tipoItem: TipoItem;
  /** Início do enunciado, para listagens. */
  trecho: string;
  gabaritoStatus: GabaritoStatus;
  gabaritoVersao: GabaritoVersao | null;
  classificada: boolean;
  temRecorte: boolean;
  topicoPrincipal: { area: string; topico: string } | null;
}

export interface QuestaoDetalhe extends Omit<QuestaoResumo, 'trecho' | 'topicoPrincipal'> {
  provaId: number;
  areaProva: string | null;
  tipoCaderno: string | null;
  enunciado: string | null;
  textoApoio: string | null;
  tipoCobranca: string | null;
  nivelCognitivo: string | null;
  normaReferencia: string | null;
  /** Vazio em Certo/Errado. Ordenadas por letra. */
  alternativas: Alternativa[];
  /** Letras aceitas como resposta (A–E em múltipla escolha, C/E em certo/errado). */
  opcoesResposta: string[];
  /** Se uma resposta agora seria pontuada (gabaritoStatus = ok). */
  pontuavel: boolean;
  topicos: Topico[];
  tecnologias: Tecnologia[];
  /** Já deduplicados e em ordem de leitura. */
  recortes: Recorte[];
}

export interface ResultadoResposta {
  respostaId: string;
  questaoId: number;
  resposta: string;
  pontuavel: boolean;
  /** null quando não pontuável: nunca conta como acerto nem como erro. */
  correta: boolean | null;
  gabaritoStatus: GabaritoStatus;
  /** Só preenchida quando gabaritoStatus = ok. */
  respostaCorreta: string | null;
  gabaritoVersao: GabaritoVersao | null;
  respondidaEm: string;
}

export interface FiltrosDisponiveis {
  bancas: string[];
  anos: number[];
  areas: { areaId: number; area: string; topicos: { topicoId: number; topico: string }[] }[];
}

export interface Placar {
  acertos: number;
  erros: number;
  /** acertos / (acertos + erros); null quando não há respostas pontuadas. */
  taxaAcerto: number | null;
}

export interface Desempenho {
  /** Só respostas pontuáveis segundo o gabarito vigente hoje. */
  geral: Placar & {
    /** Total de respostas registradas, inclusive não pontuáveis e de questões removidas. */
    respondidas: number;
    /** Respostas a questões anuladas/sem gabarito/inconsistentes (não contam). */
    naoPontuadas: number;
    /** Respostas a questões que não existem mais no banco de questões (não contam). */
    deQuestoesRemovidas: number;
  };
  porArea: (Placar & {
    areaId: number;
    area: string;
    topicos: (Placar & { topicoId: number; topico: string })[];
  })[];
  /** Respostas pontuadas de questões ainda sem tópico. */
  semClassificacao: Placar;
}

export interface HistoricoItem {
  respostaId: string;
  questaoId: number;
  resposta: string;
  respondidaEm: string;
  /** Avaliação com o gabarito vigente hoje; null quando não pontuável ou removida. */
  correta: boolean | null;
  pontuavel: boolean;
  gabaritoStatus: GabaritoStatus | null;
  /** true quando o questao_id não existe mais no ingest (ex.: prova reextraída). */
  removida: boolean;
  questao: Pick<QuestaoResumo, 'banca' | 'orgao' | 'ano' | 'numero' | 'tipoItem' | 'trecho'> | null;
}
