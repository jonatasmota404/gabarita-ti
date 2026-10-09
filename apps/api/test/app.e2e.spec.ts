import { join } from 'node:path';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { PrismaService } from '../src/prisma/prisma.service.js';
import {
  APP_URL,
  FIXTURE_DIR,
  INGEST_ADMIN_URL,
  INGEST_LEITOR_URL,
  comCliente,
  recriarIngest,
} from './bancos.js';

describe('API (e2e, AUTH_MODE=jwt)', () => {
  let app: INestApplication;
  let http: ReturnType<typeof request>;
  let token: string;
  let usuarioId: string;

  beforeAll(async () => {
    await recriarIngest();
    // O ConfigModule lê o ambiente quando o AppModule é importado: configure antes.
    Object.assign(process.env, {
      AUTH_MODE: 'jwt',
      DATABASE_URL: APP_URL,
      INGEST_DATABASE_URL: INGEST_LEITOR_URL,
      RECORTES_DIR: join(FIXTURE_DIR, 'recortes'),
      JWT_SECRET: 'segredo-de-teste-com-mais-de-32-caracteres!!',
    });
    const { AppModule } = await import('../src/app.module.js');
    const { configurarApp } = await import('../src/configurar-app.js');
    const modulo = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = modulo.createNestApplication();
    configurarApp(app);
    await app.init();
    http = request(app.getHttpServer());

    const cadastro = await http
      .post('/auth/cadastro')
      .send({ email: '  Ana@Exemplo.com ', senha: 'uma-senha-boa', nome: 'Ana' })
      .expect(201);
    token = cadastro.body.token;
    usuarioId = cadastro.body.usuario.id;
  });

  afterAll(async () => {
    await app?.close();
  });

  const auth = () => ({ Authorization: `Bearer ${token}` });

  describe('auth', () => {
    it('normaliza e-mail, não devolve hash e recusa duplicado', async () => {
      const eu = await http.get('/auth/eu').set(auth()).expect(200);
      expect(eu.body).toEqual({ id: usuarioId, email: 'ana@exemplo.com', nome: 'Ana' });
      await http
        .post('/auth/cadastro')
        .send({ email: 'ana@exemplo.com', senha: 'outra-senha-1' })
        .expect(409);
    });

    it('entra com a senha certa e recusa a errada', async () => {
      const ok = await http
        .post('/auth/entrar')
        .send({ email: 'ANA@exemplo.com', senha: 'uma-senha-boa' })
        .expect(200);
      expect(ok.body.token).toEqual(expect.any(String));
      await http
        .post('/auth/entrar')
        .send({ email: 'ana@exemplo.com', senha: 'errada!!' })
        .expect(401);
      await http
        .post('/auth/entrar')
        .send({ email: 'ninguem@exemplo.com', senha: 'errada!!' })
        .expect(401);
    });

    it('não deixa entrar como o usuário local (sem senha)', async () => {
      const { PrismaService } = await import('../src/prisma/prisma.service.js');
      await app.get<PrismaService>(PrismaService).usuario.create({
        data: { email: 'local@gabarita.ti', senhaHash: '!sem-senha' },
      });
      await http
        .post('/auth/entrar')
        .send({ email: 'local@gabarita.ti', senha: 'qualquer-coisa' })
        .expect(401);
    });

    it('valida entrada e exige token nas rotas protegidas', async () => {
      await http.post('/auth/cadastro').send({ email: 'x@y.com', senha: 'curta' }).expect(400);
      await http.get('/questoes').expect(401);
      await http.get('/questoes').set('Authorization', 'Bearer invalido').expect(401);
      await http.get('/saude').expect(200);
    });
  });

  describe('questões', () => {
    it('lista paginado com filtros e tópico principal', async () => {
      const r = await http
        .get('/questoes')
        .query({ areaId: 1, porPagina: 2 })
        .set(auth())
        .expect(200);
      expect(r.body.total).toBe(3);
      expect(r.body.itens).toHaveLength(2);
      expect(r.body.itens[0].topicoPrincipal.area).toBe('Banco de Dados');
    });

    it('mostra questões sem classificação sem quebrar', async () => {
      const r = await http
        .get('/questoes')
        .query({ semClassificacao: 'true' })
        .set(auth())
        .expect(200);
      expect(r.body.itens.map((q: { questaoId: number }) => q.questaoId).sort()).toEqual([
        310, 311,
      ]);
      expect(
        r.body.itens.every(
          (q: { classificada: boolean; topicoPrincipal: unknown }) =>
            !q.classificada && q.topicoPrincipal === null,
        ),
      ).toBe(true);
    });

    it('rejeita parâmetros inválidos', async () => {
      await http.get('/questoes').query({ porPagina: 500 }).set(auth()).expect(400);
      await http.get('/questoes').query({ coluna: 'x' }).set(auth()).expect(400);
    });

    it('detalha certo/errado com texto de apoio, sem alternativas e sem expor o gabarito', async () => {
      const r = await http.get('/questoes/206').set(auth()).expect(200);
      expect(r.body).toMatchObject({
        tipoItem: 'certo_errado',
        alternativas: [],
        opcoesResposta: ['C', 'E'],
        pontuavel: true,
        gabaritoVersao: 'preliminar',
      });
      expect(r.body.textoApoio).toContain('CB1A1');
      expect(r.body).not.toHaveProperty('respostaCorreta');
      expect(r.body.recortes).toEqual([
        expect.objectContaining({
          recorteId: 900,
          origem: 'apoio',
          url: '/questoes/206/recortes/900',
        }),
      ]);
    });

    it('deduplica recorte de apoio repetido na mesma questão', async () => {
      await comCliente(INGEST_ADMIN_URL, (c) =>
        c.query(`INSERT INTO fx_questao_recorte VALUES (205, 901, 'apoio', NULL, 'figura', 12,
          'cebraspe/2022/p20/apoio_cb1a1.png', 1)`),
      );
      const r = await http.get('/questoes/205').set(auth()).expect(200);
      expect(r.body.recortes.filter((x: { origem: string }) => x.origem === 'apoio')).toHaveLength(
        1,
      );
    });

    it('lista cada conteúdo uma vez, com totais por conteúdo', async () => {
      const r = await http.get('/questoes').query({ porPagina: 50 }).set(auth()).expect(200);
      const ids = r.body.itens.map((q: { questaoId: number }) => q.questaoId);
      expect(r.body.total).toBe(12);
      expect(ids).toHaveLength(12);
      expect(ids).toEqual(expect.arrayContaining([101, 605, 606, 607]));
      expect(ids).not.toEqual(expect.arrayContaining([601]));
      const pag = await http
        .get('/questoes')
        .query({ areaId: 1, porPagina: 1, pagina: 3 })
        .set(auth())
        .expect(200);
      expect(pag.body.total).toBe(3);
      expect(pag.body.itens).toHaveLength(1);
    });

    it('filtra por banca mostrando a cópia que atende, com o gabarito do representante', async () => {
      const r = await http.get('/questoes').query({ banca: 'vunesp' }).set(auth()).expect(200);
      const q604 = r.body.itens.find((q: { questaoId: number }) => q.questaoId === 604);
      // a cópia exibida é anulada, mas o conteúdo vale pelo representante (605, ok)
      expect(q604).toMatchObject({ banca: 'vunesp', ano: 2024, gabaritoStatus: 'ok' });
      const fgv = await http.get('/questoes').query({ banca: 'fgv' }).set(auth()).expect(200);
      expect(fgv.body.itens.map((q: { questaoId: number }) => q.questaoId).sort()).toEqual([
        310, 311, 601,
      ]);
    });

    it('mostra onde mais o conteúdo caiu, sem repetir a própria prova', async () => {
      const r = await http.get('/questoes/101').set(auth()).expect(200);
      // 602 é outro caderno da mesma prova de 101: não entra
      expect(r.body.tambemCaiuEm).toEqual([
        { questaoId: 601, banca: 'fgv', orgao: 'TCE-RJ', ano: 2021 },
      ]);
      const outra = await http.get('/questoes/601').set(auth()).expect(200);
      expect(outra.body.tambemCaiuEm).toEqual([
        { questaoId: 101, banca: 'cesgranrio', orgao: 'Petrobras', ano: 2023 },
      ]);
      expect((await http.get('/questoes/606').set(auth())).body.tambemCaiuEm).toEqual([]);
    });

    it('cópias com gabarito diferente não se contradizem: vale o representante', async () => {
      const anulada = await http.get('/questoes/604').set(auth()).expect(200);
      expect(anulada.body).toMatchObject({ gabaritoStatus: 'ok', pontuavel: true });
      expect(anulada.body.tambemCaiuEm).toEqual([
        { questaoId: 605, banca: 'fcc', orgao: 'TRT 15ª Região', ano: 2018 },
      ]);
    });

    it('marca anulada como não pontuável', async () => {
      const r = await http.get('/questoes/207').set(auth()).expect(200);
      expect(r.body).toMatchObject({ gabaritoStatus: 'anulada', pontuavel: false });
    });

    it('404 para questão inexistente', async () => {
      await http.get('/questoes/999999').set(auth()).expect(404);
    });

    it('serve recorte da questão e tolera arquivo ausente', async () => {
      const r = await http.get('/questoes/102/recortes/801').set(auth()).expect(200);
      expect(r.headers['content-type']).toBe('image/png');
      await http.get('/questoes/311/recortes/805').set(auth()).expect(404); // arquivo não existe
      await http.get('/questoes/101/recortes/801').set(auth()).expect(404); // recorte de outra questão
    });

    it('não segue path traversal vindo do banco', async () => {
      await comCliente(INGEST_ADMIN_URL, (c) =>
        c.query(`INSERT INTO fx_questao_recorte VALUES (101, 666, 'questao', NULL, 'figura', 1,
          '../../../../../../etc/passwd.png', 9)`),
      );
      await http.get('/questoes/101/recortes/666').set(auth()).expect(404);
    });

    it('lista filtros disponíveis', async () => {
      const r = await http.get('/questoes/filtros').set(auth()).expect(200);
      expect(r.body.bancas).toContain('cebraspe');
      expect(
        r.body.areas.find((a: { area: string }) => a.area === 'Banco de Dados').topicos,
      ).toHaveLength(3);
    });
  });

  describe('respostas, desempenho e histórico', () => {
    it('registra acerto e erro em questão pontuável', async () => {
      const acerto = await http
        .post('/questoes/101/respostas')
        .set(auth())
        .send({ resposta: 'b' })
        .expect(201);
      expect(acerto.body).toMatchObject({
        pontuavel: true,
        correta: true,
        respostaCorreta: 'B',
        gabaritoStatus: 'ok',
      });
      const erro = await http
        .post('/questoes/206/respostas')
        .set(auth())
        .send({ resposta: 'C' })
        .expect(201);
      expect(erro.body).toMatchObject({
        pontuavel: true,
        correta: false,
        respostaCorreta: 'E',
        gabaritoVersao: 'preliminar',
      });
    });

    it.each([
      [207, 'C', 'anulada'],
      [310, 'A', 'sem_gabarito'],
      [311, 'A', 'inconsistente'],
    ])('questão %i (%s) com status %s não registra acerto nem erro', async (id, letra, status) => {
      const r = await http
        .post(`/questoes/${id}/respostas`)
        .set(auth())
        .send({ resposta: letra })
        .expect(201);
      expect(r.body).toMatchObject({
        pontuavel: false,
        correta: null,
        respostaCorreta: null,
        gabaritoStatus: status,
      });
    });

    it('valida a letra pelo tipo de item', async () => {
      await http.post('/questoes/206/respostas').set(auth()).send({ resposta: 'A' }).expect(422); // C/E
      await http.post('/questoes/311/respostas').set(auth()).send({ resposta: 'E' }).expect(422); // só A–D
      await http.post('/questoes/101/respostas').set(auth()).send({ resposta: 'AB' }).expect(400);
      await http.post('/questoes/999999/respostas').set(auth()).send({ resposta: 'A' }).expect(404);
    });

    it('calcula desempenho só com pontuáveis e tolera questão removida', async () => {
      const prisma = app.get<PrismaService>(
        (await import('../src/prisma/prisma.service.js')).PrismaService,
      );
      // Simula um questao_id órfão (prova reextraída com novos ids no ingest).
      await prisma.resposta.create({
        data: {
          usuarioId,
          questaoId: 424242,
          resposta: 'A',
          tipoItem: 'multipla_escolha',
          gabaritoStatus: 'ok',
          respostaCorreta: 'A',
          pontuavel: true,
          correta: true,
        },
      });

      const d = await http.get('/desempenho').set(auth()).expect(200);
      expect(d.body.geral).toEqual({
        acertos: 1,
        erros: 1,
        taxaAcerto: 0.5,
        respondidas: 6,
        conteudosRespondidos: 5,
        naoPontuadas: 3,
        deQuestoesRemovidas: 1,
      });
      const bd = d.body.porArea.find((a: { area: string }) => a.area === 'Banco de Dados');
      expect(bd).toMatchObject({ acertos: 1, erros: 0 });
      const seg = d.body.porArea.find(
        (a: { area: string }) => a.area === 'Segurança da Informação',
      );
      expect(seg).toMatchObject({ acertos: 0, erros: 1, taxaAcerto: 0 });
    });

    it('histórico marca questão removida sem quebrar', async () => {
      const h = await http.get('/historico').set(auth()).expect(200);
      expect(h.body.total).toBe(6);
      const removida = h.body.itens.find((i: { questaoId: number }) => i.questaoId === 424242);
      expect(removida).toMatchObject({
        removida: true,
        questao: null,
        correta: null,
        pontuavel: false,
      });
      const anulada = h.body.itens.find((i: { questaoId: number }) => i.questaoId === 207);
      expect(anulada).toMatchObject({
        removida: false,
        pontuavel: false,
        correta: null,
        gabaritoStatus: 'anulada',
      });
      expect(anulada.questao).toMatchObject({ banca: 'cebraspe', numero: 43 });
    });

    it('desempenho e respostas são por conteúdo, pelo representante', async () => {
      const cadastro = await http
        .post('/auth/cadastro')
        .send({ email: 'caio@exemplo.com', senha: 'senha-do-caio' })
        .expect(201);
      const caio = { Authorization: `Bearer ${cadastro.body.token}` };
      const responder = (id: number, resposta: string) =>
        http.post(`/questoes/${id}/respostas`).set(caio).send({ resposta }).expect(201);

      // 604 está anulada, mas o conteúdo vale pela 605 (ok, C): pontua e grava o id da cópia
      const r604 = await responder(604, 'C');
      expect(r604.body).toMatchObject({ questaoId: 604, pontuavel: true, correta: true });
      // 606/607 têm chave NULL: são conteúdos distintos
      await responder(606, 'B'); // erro (A)
      await responder(607, 'A'); // acerto
      // 101, 601 e 602 são o mesmo conteúdo (gabarito B); toda tentativa conta
      await responder(601, 'B'); // acerto
      await responder(101, 'A'); // erro
      await responder(602, 'B'); // acerto

      const d = await http.get('/desempenho').set(caio).expect(200);
      expect(d.body.geral).toEqual({
        acertos: 4,
        erros: 2,
        taxaAcerto: 4 / 6,
        respondidas: 6,
        conteudosRespondidos: 4, // 604/605, 606, 607 e 101/601/602
        naoPontuadas: 0,
        deQuestoesRemovidas: 0,
      });
      const bd = d.body.porArea.find((a: { area: string }) => a.area === 'Banco de Dados');
      expect(bd).toMatchObject({ acertos: 2, erros: 1 });

      // o histórico mostra a cópia respondida, avaliada pelo representante
      const h = await http.get('/historico').set(caio).expect(200);
      const item604 = h.body.itens.find((i: { questaoId: number }) => i.questaoId === 604);
      expect(item604).toMatchObject({ correta: true, gabaritoStatus: 'ok', removida: false });
      expect(item604.questao).toMatchObject({ banca: 'vunesp', numero: 22 });
    });

    it('cópia antiga respondida por id continua casando pelo conteúdo', async () => {
      // Hoje 601 resolve para 101. Se o representante deixar de existir (reextração), a
      // resposta segue valendo para o conteúdo, agora representado por outra cópia.
      const cadastro = await http
        .post('/auth/cadastro')
        .send({ email: 'dani@exemplo.com', senha: 'senha-da-dani' })
        .expect(201);
      const dani = { Authorization: `Bearer ${cadastro.body.token}` };
      await http.post('/questoes/601/respostas').set(dani).send({ resposta: 'B' }).expect(201);
      await comCliente(INGEST_ADMIN_URL, async (c) => {
        await c.query('DELETE FROM fx_questao_estudo WHERE questao_id IN (101, 602)');
      });
      const d = await http.get('/desempenho').set(dani).expect(200);
      expect(d.body.geral).toMatchObject({ acertos: 1, erros: 0, deQuestoesRemovidas: 0 });
    });

    it('isola dados entre usuários', async () => {
      const outro = await http
        .post('/auth/cadastro')
        .send({ email: 'bia@exemplo.com', senha: 'senha-da-bia' })
        .expect(201);
      const d = await http
        .get('/desempenho')
        .set('Authorization', `Bearer ${outro.body.token}`)
        .expect(200);
      expect(d.body.geral.respondidas).toBe(0);
    });
  });
});
