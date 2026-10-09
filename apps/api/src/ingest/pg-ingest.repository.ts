import { Logger, ServiceUnavailableException } from '@nestjs/common';
import type { OnModuleDestroy } from '@nestjs/common';
import pg from 'pg';
import {
  IngestRepository,
  type AlternativaIngest,
  type CopiaIngest,
  type FiltroQuestoes,
  type FiltrosIngest,
  type QuestaoEstudo,
  type QuestaoGabarito,
  type RecorteIngest,
  type TecnologiaIngest,
  type TopicoIngest,
} from './ingest.repository.js';

// Colunas sempre nomeadas (nunca SELECT *): o contrato só garante nomes, não posições.
const COLUNAS_ESTUDO = `
  e.questao_id AS "questaoId", e.prova_id AS "provaId", e.banca, e.orgao, e.ano, e.cargo,
  e.area_prova AS "areaProva", e.tipo_caderno AS "tipoCaderno", e.numero,
  e.tipo_item AS "tipoItem", e.enunciado, e.texto_apoio AS "textoApoio",
  e.gabarito_status AS "gabaritoStatus", e.resposta_correta AS "respostaCorreta",
  e.gabarito_versao AS "gabaritoVersao", e.tipo_cobranca AS "tipoCobranca",
  e.tipo_cobranca_confianca AS "tipoCobrancaConfianca", e.nivel_cognitivo AS "nivelCognitivo",
  e.nivel_cognitivo_confianca AS "nivelCognitivoConfianca",
  e.norma_referencia AS "normaReferencia", e.classificada, e.tem_recorte AS "temRecorte",
  e.chave_conteudo AS "chaveConteudo"`;

const COLUNAS_GABARITO = `
  e.questao_id AS "questaoId", e.banca, e.orgao, e.ano, e.numero, e.tipo_item AS "tipoItem",
  e.enunciado, e.gabarito_status AS "gabaritoStatus", e.resposta_correta AS "respostaCorreta",
  e.gabarito_versao AS "gabaritoVersao"`;

// Identidade do conteúdo: chave não nula agrupa cópias; chave NULL é sempre única (por id).
const GRUPO = `COALESCE('c:' || e.chave_conteudo, 'q:' || e.questao_id)`;
// Melhor cópia primeiro: gabarito ok, ano mais recente (nulo por último), menor id.
const MELHOR_COPIA = `(e.gabarito_status = 'ok') DESC, e.ano DESC NULLS LAST, e.questao_id`;

/**
 * Leitura do Postgres do provas-ti-ingest pelas views v_questao_* com o role app_leitor.
 * Pool próprio, isolado do banco do app, e forçado a transações somente leitura.
 */
export class PgIngestRepository extends IngestRepository implements OnModuleDestroy {
  private readonly logger = new Logger('Ingest');
  private readonly pool: pg.Pool;

  constructor(connectionString: string) {
    super();
    this.pool = new pg.Pool({
      connectionString,
      max: 5,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
      // Defesa em profundidade: o role já é read-only no ingest; aqui garantimos de novo.
      options: '-c default_transaction_read_only=on -c statement_timeout=10000',
      application_name: 'gabarita-ti',
    });
    this.pool.on('error', (err) => this.logger.error(`erro no pool do ingest: ${err.message}`));
  }

  async onModuleDestroy() {
    await this.pool.end();
  }

  private async consultar<T extends pg.QueryResultRow>(sql: string, params: unknown[] = []) {
    try {
      const { rows } = await this.pool.query<T>(sql, params);
      return rows;
    } catch (err) {
      this.logger.error(`falha ao consultar o banco de questões: ${(err as Error).message}`);
      throw new ServiceUnavailableException('Banco de questões indisponível no momento');
    }
  }

  async listarQuestoes(filtro: FiltroQuestoes, pagina: { offset: number; limite: number }) {
    const condicoes: string[] = [];
    const params: unknown[] = [];
    const param = (valor: unknown) => {
      params.push(valor);
      return `$${params.length}`;
    };
    if (filtro.banca) condicoes.push(`e.banca = ${param(filtro.banca)}`);
    if (filtro.ano !== undefined) condicoes.push(`e.ano = ${param(filtro.ano)}`);
    if (filtro.tipoItem) condicoes.push(`e.tipo_item = ${param(filtro.tipoItem)}`);
    if (filtro.semClassificacao) condicoes.push('e.classificada = false');
    if (filtro.areaId !== undefined) {
      condicoes.push(
        `EXISTS (SELECT 1 FROM v_questao_topico t WHERE t.questao_id = e.questao_id AND t.area_id = ${param(filtro.areaId)})`,
      );
    }
    if (filtro.topicoId !== undefined) {
      condicoes.push(
        `EXISTS (SELECT 1 FROM v_questao_topico t WHERE t.questao_id = e.questao_id AND t.topico_id = ${param(filtro.topicoId)})`,
      );
    }
    const where = condicoes.length ? `WHERE ${condicoes.join(' AND ')}` : '';
    // Primeiro filtra as cópias, depois escolhe uma por conteúdo entre as que atendem.
    const candidatas = `
      SELECT DISTINCT ON (${GRUPO}) ${COLUNAS_ESTUDO}
        FROM v_questao_estudo e ${where}
       ORDER BY ${GRUPO}, ${MELHOR_COPIA}`;
    const [contagem] = await this.consultar<{ total: number }>(
      `SELECT count(*)::int AS total FROM (${candidatas}) c`,
      params,
    );
    const questoes = await this.consultar<QuestaoEstudo>(
      `SELECT * FROM (${candidatas}) c
        ORDER BY c."ano" DESC NULLS LAST, c."banca", c."provaId", c."numero", c."questaoId"
        LIMIT ${param(pagina.limite)} OFFSET ${param(pagina.offset)}`,
      params,
    );
    return { questoes, total: contagem?.total ?? 0 };
  }

  async buscarQuestao(questaoId: number) {
    const [questao] = await this.consultar<QuestaoEstudo>(
      `SELECT ${COLUNAS_ESTUDO} FROM v_questao_estudo e WHERE e.questao_id = $1`,
      [questaoId],
    );
    return questao ?? null;
  }

  async resolverRepresentantes(questaoIds: number[]) {
    const resolvidos = new Map<number, QuestaoGabarito>();
    if (!questaoIds.length) return resolvidos;
    // `r.chave_conteudo = a.chave_conteudo` é nulo quando a chave é NULL: sobra só a própria questão.
    const linhas = await this.consultar<QuestaoGabarito & { origemId: number }>(
      `SELECT a.questao_id AS "origemId", r."questaoId", r.banca, r.orgao, r.ano, r.numero,
              r."tipoItem", r.enunciado, r."gabaritoStatus", r."respostaCorreta", r."gabaritoVersao"
         FROM v_questao_estudo a
        CROSS JOIN LATERAL (
          SELECT ${COLUNAS_GABARITO} FROM v_questao_estudo e
           WHERE e.questao_id = a.questao_id OR e.chave_conteudo = a.chave_conteudo
           ORDER BY ${MELHOR_COPIA} LIMIT 1
        ) r
        WHERE a.questao_id = ANY($1::int[])`,
      [questaoIds],
    );
    for (const { origemId, ...gabarito } of linhas) resolvidos.set(origemId, gabarito);
    return resolvidos;
  }

  async listarCopias(questaoId: number) {
    return this.consultar<CopiaIngest>(
      `SELECT c.questao_id AS "questaoId", c.banca, c.orgao, c.ano
         FROM v_questao_estudo e
         JOIN v_questao_estudo c ON c.chave_conteudo = e.chave_conteudo AND c.questao_id <> e.questao_id
        WHERE e.questao_id = $1
        ORDER BY c.ano DESC NULLS LAST, c.banca, c.orgao, c.questao_id`,
      [questaoId],
    );
  }

  async buscarGabaritos(questaoIds: number[]) {
    if (!questaoIds.length) return [];
    return this.consultar<QuestaoGabarito>(
      `SELECT ${COLUNAS_GABARITO} FROM v_questao_estudo e
        WHERE e.questao_id = ANY($1::int[]) ORDER BY e.questao_id`,
      [questaoIds],
    );
  }

  async listarAlternativas(questaoId: number) {
    return this.consultar<AlternativaIngest>(
      `SELECT questao_id AS "questaoId", letra, texto FROM v_questao_alternativa
        WHERE questao_id = $1 ORDER BY letra`,
      [questaoId],
    );
  }

  async listarTopicos(questaoIds: number[]) {
    if (!questaoIds.length) return [];
    return this.consultar<TopicoIngest>(
      `SELECT questao_id AS "questaoId", area_id AS "areaId", area, topico_id AS "topicoId",
              topico, principal, confianca
         FROM v_questao_topico WHERE questao_id = ANY($1::int[])
        ORDER BY questao_id, principal DESC, confianca DESC NULLS LAST, topico_id`,
      [questaoIds],
    );
  }

  async listarTecnologias(questaoId: number) {
    return this.consultar<TecnologiaIngest>(
      `SELECT questao_id AS "questaoId", tecnologia_id AS "tecnologiaId", tecnologia, categoria,
              confianca
         FROM v_questao_tecnologia WHERE questao_id = $1
        ORDER BY confianca DESC NULLS LAST, tecnologia`,
      [questaoId],
    );
  }

  async listarRecortes(questaoId: number) {
    return this.consultar<RecorteIngest>(
      `SELECT questao_id AS "questaoId", recorte_id AS "recorteId", origem,
              letra_alternativa AS "letraAlternativa", tipo, pagina,
              caminho_relativo AS "caminhoRelativo", ordem
         FROM v_questao_recorte WHERE questao_id = $1
        ORDER BY ordem, recorte_id`,
      [questaoId],
    );
  }

  async listarFiltros(): Promise<FiltrosIngest> {
    const [bancas, anos, topicos] = await Promise.all([
      this.consultar<{ banca: string }>(
        'SELECT DISTINCT banca FROM v_questao_estudo ORDER BY banca',
      ),
      this.consultar<{ ano: number }>(
        'SELECT DISTINCT ano FROM v_questao_estudo WHERE ano IS NOT NULL ORDER BY ano DESC',
      ),
      this.consultar<FiltrosIngest['topicos'][number]>(
        `SELECT DISTINCT area_id AS "areaId", area, topico_id AS "topicoId", topico
           FROM v_questao_topico ORDER BY area, topico`,
      ),
    ]);
    return { bancas: bancas.map((b) => b.banca), anos: anos.map((a) => a.ano), topicos };
  }
}
