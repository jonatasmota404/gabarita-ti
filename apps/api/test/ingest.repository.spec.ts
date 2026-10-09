import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PgIngestRepository } from '../src/ingest/pg-ingest.repository.js';
import { INGEST_LEITOR_URL, comCliente, recriarIngest } from './bancos.js';

// Integração do módulo `ingest` contra a fixture do contrato v1.1, conectando com um role
// que só tem SELECT nas views (como o app_leitor real).
describe('PgIngestRepository (fixture do contrato v1.1)', () => {
  let repo: PgIngestRepository;

  beforeAll(async () => {
    await recriarIngest();
    repo = new PgIngestRepository(INGEST_LEITOR_URL);
  });
  afterAll(() => repo.onModuleDestroy());

  it('lista paginado, com total, em ordem estável', async () => {
    const p1 = await repo.listarQuestoes({}, { offset: 0, limite: 4 });
    const p2 = await repo.listarQuestoes({}, { offset: 4, limite: 10 });
    // 15 linhas na view, 12 conteúdos distintos (101=601=602 e 604=605)
    expect(p1.total).toBe(12);
    expect(p1.questoes).toHaveLength(4);
    expect(p2.questoes).toHaveLength(8);
    const ids = [...p1.questoes, ...p2.questoes].map((q) => q.questaoId);
    expect(new Set(ids).size).toBe(12);
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
    expect(await ids({ areaId: 5 })).toEqual([520, 605, 606, 607]);
    expect(await ids({ topicoId: 21 })).toEqual([205, 206]);
    expect(await ids({ tipoItem: 'certo_errado', areaId: 4 })).toEqual([207]);
    expect(await ids({ semClassificacao: true })).toEqual([310, 311]);
  });

  it('mostra cada conteúdo uma vez, escolhendo o representante', async () => {
    const todas = (await repo.listarQuestoes({}, { offset: 0, limite: 50 })).questoes;
    const ids = todas.map((q) => q.questaoId);
    // 101/601/602: todas ok e 101 e 602 empatam no ano, vence o menor id
    expect(ids).toContain(101);
    expect(ids).not.toContain(601);
    expect(ids).not.toContain(602);
    // 604 (anulada, 2024) x 605 (ok, 2018): gabarito ok vem antes do ano
    expect(ids).toContain(605);
    expect(ids).not.toContain(604);
    // chave NULL nunca agrupa: 606 e 607 têm o mesmo enunciado e continuam as duas
    expect(ids).toEqual(expect.arrayContaining([606, 607]));
    expect(todas.find((q) => q.questaoId === 606)!.chaveConteudo).toBeNull();
    expect(todas.find((q) => q.questaoId === 101)!.chaveConteudo).toMatch(/^a{64}$/);
  });

  it('filtro por banca/ano mostra a cópia que atende ao filtro, se houver', async () => {
    const pag = { offset: 0, limite: 50 };
    const lista = async (f: Parameters<typeof repo.listarQuestoes>[0]) =>
      (await repo.listarQuestoes(f, pag)).questoes.map((q) => q.questaoId).sort();
    // o conteúdo 101 também caiu na FGV 2021 (601): só essa cópia atende
    expect(await lista({ banca: 'fgv' })).toEqual([310, 311, 601]);
    expect(await lista({ ano: 2021 })).toEqual([601]);
    // Vunesp: 604 (anulada) atende ao filtro, então é ela que aparece, não a 605
    expect(await lista({ banca: 'vunesp' })).toEqual([520, 604, 607]);
    // sem a Vunesp no filtro volta o representante
    expect(await lista({ banca: 'fcc' })).toEqual([415, 605, 606]);
    // totais refletem conteúdos, não cópias
    const { total } = await repo.listarQuestoes({ topicoId: 11 }, pag);
    expect(total).toBe(1);
  });

  it('resolve o representante de qualquer cópia, só pela view', async () => {
    const r = await repo.resolverRepresentantes([601, 602, 101, 604, 605, 606, 999999]);
    const pares = [...r].map(([origem, g]) => [origem, g.questaoId, g.gabaritoStatus]);
    expect(pares).toEqual(
      expect.arrayContaining([
        [601, 101, 'ok'],
        [602, 101, 'ok'],
        [101, 101, 'ok'],
        [604, 605, 'ok'], // a anulada resolve para a cópia ok
        [605, 605, 'ok'],
        [606, 606, 'ok'], // chave NULL: ela mesma
      ]),
    );
    expect(r.has(999999)).toBe(false);
    expect((await repo.resolverRepresentantes([])).size).toBe(0);
  });

  it('lista as outras cópias do conteúdo (nunca por chave nula)', async () => {
    const copias = await repo.listarCopias(101);
    expect(copias.map((c) => [c.questaoId, c.banca, c.ano])).toEqual([
      [602, 'cesgranrio', 2023],
      [601, 'fgv', 2021],
    ]);
    expect(await repo.listarCopias(606)).toEqual([]);
    expect(await repo.listarCopias(999999)).toEqual([]);
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
    expect(f.anos).toEqual([2024, 2023, 2022, 2021, 2019, 2018, 2017, 2016]);
    expect(f.topicos.length).toBe(9);
  });

  it('o role da fixture só lê views (não as tabelas base) e não escreve', async () => {
    await comCliente(INGEST_LEITOR_URL, async (c) => {
      await expect(c.query('SELECT 1 FROM fx_questao_estudo')).rejects.toThrow(/permission denied/);
      await expect(c.query('CREATE TABLE x (a int)')).rejects.toThrow(/read-only/);
    });
  });
});
