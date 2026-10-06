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

describe('API (e2e)', () => {
  let app: INestApplication;
  let http: ReturnType<typeof request>;
  let token: string;
  let usuarioId: string;

  beforeAll(async () => {
    await recriarIngest();
    // O ConfigModule lê o ambiente quando o AppModule é importado: configure antes.
    Object.assign(process.env, {
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
