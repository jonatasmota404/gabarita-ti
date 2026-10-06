import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PgIngestRepository } from '../src/ingest/pg-ingest.repository.js';
import { INGEST_LEITOR_URL, comCliente, recriarIngest } from './bancos.js';

// Integração do módulo `ingest` contra a fixture do contrato v1, conectando com um role
// que só tem SELECT nas views (como o app_leitor real).
describe('PgIngestRepository (fixture do contrato v1)', () => {
  let repo: PgIngestRepository;

  beforeAll(async () => {
    await recriarIngest();
    repo = new PgIngestRepository(INGEST_LEITOR_URL);
  });
  afterAll(() => repo.onModuleDestroy());

  it('lista paginado, com total, em ordem estável', async () => {
    const p1 = await repo.listarQuestoes({}, { offset: 0, limite: 4 });
    const p2 = await repo.listarQuestoes({}, { offset: 4, limite: 10 });
    expect(p1.total).toBe(9);
    expect(p1.questoes).toHaveLength(4);
    const ids = [...p1.questoes, ...p2.questoes].map((q) => q.questaoId);
    expect(new Set(ids).size).toBe(9);
    // ano nulo vai para o fim
    expect(p2.questoes.at(-1)!.ano).toBeNull();
  });

  it('filtra por banca, ano, área, tópico, tipo de item e sem classificação', async () => {
    const pag = { offset: 0, limite: 50 };
    const ids = async (f: Parameters<typeof repo.listarQuestoes>[0]) =>
      (await repo.listarQuestoes(f, pag)).questoes.map((q) => q.questaoId).sort();
    expect(await ids({ banca: 'cebraspe' })).toEqual([205, 206, 207]);
    expect(await ids({ ano: 2023 })).toEqual([101, 102]);
    expect(await ids({ areaId: 1 })).toEqual([101, 102, 415]);
    expect(await ids({ topicoId: 21 })).toEqual([205, 206]);
    expect(await ids({ tipoItem: 'certo_errado', areaId: 4 })).toEqual([207]);
    expect(await ids({ semClassificacao: true })).toEqual([310, 311]);
  });

  it('mapeia as colunas do contrato e respeita nulos', async () => {
    const q = await repo.buscarQuestao(310);
    expect(q).toMatchObject({
      questaoId: 310,
      banca: 'fgv',
      ano: null,
      areaProva: null,
      tipoItem: 'multipla_escolha',
      gabaritoStatus: 'sem_gabarito',
      respostaCorreta: null,
      classificada: false,
      temRecorte: true,
    });
    expect(await repo.buscarQuestao(123456)).toBeNull();
  });

  it('busca gabaritos ignorando ids órfãos', async () => {
    const g = await repo.buscarGabaritos([101, 999999, 207]);
    expect(g.map((x) => [x.questaoId, x.gabaritoStatus, x.respostaCorreta])).toEqual([
      [101, 'ok', 'B'],
      [207, 'anulada', null],
    ]);
    expect(await repo.buscarGabaritos([])).toEqual([]);
  });

  it('lê alternativas, tópicos, tecnologias e recortes das views', async () => {
    expect((await repo.listarAlternativas(101)).map((a) => a.letra)).toEqual([
      'A',
      'B',
      'C',
      'D',
      'E',
    ]);
    expect(await repo.listarAlternativas(205)).toEqual([]);
    const topicos = await repo.listarTopicos([205]);
    expect(topicos[0]).toMatchObject({ topico: 'Criptografia', principal: true });
    expect(await repo.listarTecnologias(415)).toEqual([
      {
        questaoId: 415,
        tecnologiaId: 1,
        tecnologia: 'PostgreSQL',
        categoria: 'tecnologia',
        confianca: 0.99,
      },
    ]);
    expect((await repo.listarRecortes(311)).map((r) => r.letraAlternativa)).toEqual([
      'A',
      'B',
      'C',
    ]);
  });

  it('monta os filtros disponíveis', async () => {
    const f = await repo.listarFiltros();
    expect(f.bancas).toEqual(['cebraspe', 'cesgranrio', 'fcc', 'fgv', 'vunesp']);
    expect(f.anos).toEqual([2024, 2023, 2022, 2019]);
    expect(f.topicos.length).toBe(7);
  });

  it('o role da fixture só lê views (não as tabelas base) e não escreve', async () => {
    await comCliente(INGEST_LEITOR_URL, async (c) => {
      await expect(c.query('SELECT 1 FROM fx_questao_estudo')).rejects.toThrow(/permission denied/);
      await expect(c.query('CREATE TABLE x (a int)')).rejects.toThrow(/read-only/);
    });
  });
});
