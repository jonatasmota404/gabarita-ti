import { join } from 'node:path';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { APP_URL, FIXTURE_DIR, INGEST_LEITOR_URL, comCliente, recriarIngest } from './bancos.js';

describe('API (e2e, AUTH_MODE=local)', () => {
  let app: INestApplication;
  let http: ReturnType<typeof request>;

  beforeAll(async () => {
    await recriarIngest();
    await comCliente(APP_URL, (c) => c.query('TRUNCATE usuario CASCADE'));
    Object.assign(process.env, {
      AUTH_MODE: 'local',
      DATABASE_URL: APP_URL,
      INGEST_DATABASE_URL: INGEST_LEITOR_URL,
      RECORTES_DIR: join(FIXTURE_DIR, 'recortes'),
    });
    delete process.env.JWT_SECRET;
    const { AppModule } = await import('../src/app.module.js');
    const { configurarApp } = await import('../src/configurar-app.js');
    const modulo = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = modulo.createNestApplication();
    configurarApp(app);
    await app.init();
    http = request(app.getHttpServer());
  });

  afterAll(async () => {
    await app?.close();
  });

  it('lista, responde e mostra desempenho sem token, com o usuário local fixo', async () => {
    const lista = await http.get('/questoes').expect(200);
    expect(lista.body.total).toBeGreaterThan(0);

    const r = await http.post('/questoes/101/respostas').send({ resposta: 'B' }).expect(201);
    expect(r.body).toMatchObject({ pontuavel: true, correta: true });
    await http.post('/questoes/206/respostas').send({ resposta: 'C' }).expect(201);

    const d = await http.get('/desempenho').expect(200);
    expect(d.body.geral).toMatchObject({ acertos: 1, erros: 1, respondidas: 2 });
    const h = await http.get('/historico').expect(200);
    expect(h.body.total).toBe(2);
  });

  it('cria um único usuário local e atribui a ele todas as respostas', async () => {
    const eu = await http.get('/auth/eu').expect(200);
    expect(eu.body).toMatchObject({ email: 'local@gabarita.ti' });
    const usuarios = await comCliente(APP_URL, (c) =>
      c.query('SELECT id, email, senha_hash FROM usuario'),
    );
    expect(usuarios.rows).toHaveLength(1);
    expect(usuarios.rows[0].id).toBe(eu.body.id);
    const donos = await comCliente(APP_URL, (c) =>
      c.query('SELECT DISTINCT usuario_id FROM resposta'),
    );
    expect(donos.rows).toEqual([{ usuario_id: eu.body.id }]);
  });

  it('ignora token enviado e desliga cadastro e login', async () => {
    await http.get('/questoes').set('Authorization', 'Bearer invalido').expect(200);
    await http
      .post('/auth/cadastro')
      .send({ email: 'x@y.com', senha: 'uma-senha-boa' })
      .expect(404);
    await http.post('/auth/entrar').send({ email: 'x@y.com', senha: 'uma-senha-boa' }).expect(404);
  });
});
