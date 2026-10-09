// Porta de leitura do banco de questões (provas-ti-ingest). O resto do app depende só desta
// interface e destes tipos, nunca de SQL. Campos = colunas das views v_questao_* do contrato
// (provas-ti-ingest/docs/contrato-app.md), em camelCase.

export interface QuestaoEstudo {
  questaoId: number;
  provaId: number;
  banca: string;
  orgao: string;
  ano: number | null;
  cargo: string;
  areaProva: string | null;
  tipoCaderno: string | null;
  numero: number;
  tipoItem: string;
  enunciado: string | null;
  textoApoio: string | null;
  gabaritoStatus: string;
  respostaCorreta: string | null;
  gabaritoVersao: string | null;
  tipoCobranca: string | null;
  tipoCobrancaConfianca: number | null;
  nivelCognitivo: string | null;
  nivelCognitivoConfianca: number | null;
  normaReferencia: string | null;
  classificada: boolean;
  temRecorte: boolean;
  /** Hash opaco do conteúdo (v1.1). Mesma chave não nula = mesma questão em outra prova. */
  chaveConteudo: string | null;
}

/** Só o necessário para avaliar uma resposta e listar no histórico. */
export type QuestaoGabarito = Pick<
  QuestaoEstudo,
  | 'questaoId'
  | 'banca'
  | 'orgao'
  | 'ano'
  | 'numero'
  | 'tipoItem'
  | 'enunciado'
  | 'gabaritoStatus'
  | 'respostaCorreta'
  | 'gabaritoVersao'
>;

/** Onde mais um conteúdo apareceu: uma cópia (mesma chave) em outra prova. */
export interface CopiaIngest {
  questaoId: number;
  banca: string;
  orgao: string;
  ano: number | null;
}

export interface AlternativaIngest {
  questaoId: number;
  letra: string;
  texto: string;
}

export interface TopicoIngest {
  questaoId: number;
  areaId: number;
  area: string;
  topicoId: number;
  topico: string;
  principal: boolean;
  confianca: number | null;
}

export interface TecnologiaIngest {
  questaoId: number;
  tecnologiaId: number;
  tecnologia: string;
  categoria: string;
  confianca: number | null;
}

export interface RecorteIngest {
  questaoId: number;
  recorteId: number;
  origem: string;
  letraAlternativa: string | null;
  tipo: string;
  pagina: number;
  caminhoRelativo: string;
  ordem: number;
}

export interface FiltroQuestoes {
  banca?: string;
  ano?: number;
  areaId?: number;
  topicoId?: number;
  tipoItem?: string;
  /** true: só questões com classificada = false. */
  semClassificacao?: boolean;
}

export interface FiltrosIngest {
  bancas: string[];
  anos: number[];
  topicos: Omit<TopicoIngest, 'questaoId' | 'principal' | 'confianca'>[];
}

export abstract class IngestRepository {
  /**
   * Cada conteúdo distinto aparece uma vez (e `total` conta conteúdos). Com filtros, o
   * conteúdo entra se QUALQUER cópia atender, e a cópia devolvida é a melhor entre as que
   * atendem: gabarito ok, ano mais recente, menor id.
   */
  abstract listarQuestoes(
    filtro: FiltroQuestoes,
    pagina: { offset: number; limite: number },
  ): Promise<{ questoes: QuestaoEstudo[]; total: number }>;

  abstract buscarQuestao(questaoId: number): Promise<QuestaoEstudo | null>;

  /**
   * Para cada id, o gabarito do representante do conteúdo (gabarito ok, depois ano mais
   * recente, depois menor id). Chave nula = o próprio id. Ids inexistentes não voltam.
   * A chave é derivada da view na hora: nunca persista o resultado como identificador.
   */
  abstract resolverRepresentantes(questaoIds: number[]): Promise<Map<number, QuestaoGabarito>>;

  /** Demais cópias do mesmo conteúdo (mesma chave não nula), sem a própria questão. */
  abstract listarCopias(questaoId: number): Promise<CopiaIngest[]>;

  /** Ids inexistentes (ex.: órfãos de uma reextração) simplesmente não voltam. */
  abstract buscarGabaritos(questaoIds: number[]): Promise<QuestaoGabarito[]>;

  abstract listarAlternativas(questaoId: number): Promise<AlternativaIngest[]>;

  abstract listarTopicos(questaoIds: number[]): Promise<TopicoIngest[]>;

  abstract listarTecnologias(questaoId: number): Promise<TecnologiaIngest[]>;

  abstract listarRecortes(questaoId: number): Promise<RecorteIngest[]>;

  abstract listarFiltros(): Promise<FiltrosIngest>;
}
