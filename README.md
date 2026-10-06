# Gabarita TI

PWA de estudo para concursos de TI: resolver questões reais (múltipla escolha e Certo/Errado),
ver o gabarito na hora e acompanhar a taxa de acerto por área e tópico. Mobile-first, instalável,
com modo escuro.

As questões vêm do **provas-ti-ingest** (projeto separado), lidas **somente** pelas views do
contrato de leitura v1 (`provas-ti-ingest/docs/contrato-app.md`). O app tem o próprio banco
para usuários e respostas.

## Estrutura

```
apps/api         NestJS (ESM) — auth, questões, respostas, desempenho
  src/ingest     único módulo que conhece o banco do ingest (porta IngestRepository + impl. pg)
  prisma/        schema e migrações do banco PRÓPRIO do app
apps/web         Next.js 16 (App Router) + Tailwind 4, PWA, BFF em /api/*
packages/shared  tipos dos DTOs HTTP (web e futuros clientes nativos)
infra/
  ingest-fixture SQL que recria as views v_questao_* do contrato + questões e recortes de exemplo
  db-init        init do Postgres local (cria bancos, aplica a fixture e o role app_leitor)
```

## Rodando localmente

Requisitos: Node 24 (ou ≥ 22.12), pnpm 11 e Docker.

```bash
cp .env.example .env              # valores de desenvolvimento; troque o JWT_SECRET
pnpm install
pnpm db:up                        # Postgres em localhost:5436 (app + fixture do ingest)
pnpm db:migrate                   # aplica as migrações Prisma no banco do app
pnpm dev                          # API em :3001, web em :3000
```

Abra http://localhost:3000, crie uma conta e resolva as questões de exemplo. A fixture cobre:
múltipla escolha, Certo/Errado, grupo com texto de apoio e figura compartilhada, figura no
enunciado e nas alternativas, imagem ausente, anulada, sem gabarito, inconsistente, gabarito
preliminar e questões sem classificação.

O init do Postgres só roda na criação do volume. Para recriar tudo do zero, use `docker compose down -v && pnpm db:up`.

### Scripts (na raiz)

| comando       | o quê                                      |
| ------------- | ------------------------------------------ |
| `pnpm dev`    | API e web em modo watch                    |
| `pnpm test`   | testes da API (unit + integração) e do web |
| `pnpm lint`   | ESLint + Prettier (check)                  |
| `pnpm build`  | build de shared, API e web                 |
| `pnpm format` | Prettier (write)                           |

Os testes de integração da API usam o Postgres do docker compose (`TEST_ADMIN_DATABASE_URL`) e
**recriam bancos descartáveis** (`gabarita_test`, `gabarita_ingest_test`) a cada execução, com a
fixture do contrato e um role que só tem `SELECT` nas views. Nunca tocam no banco real.

## Apontando para o banco real do ingest

1. No provas-ti-ingest, crie/atualize o role somente leitura (comando do contrato):
   `APP_LEITOR_SENHA='...' uv run python -m provas_ti_ingest.role_leitor`
2. No `.env` do app:
   ```
   INGEST_DATABASE_URL=postgresql://app_leitor:<senha>@<host>:5435/provas_ti
   RECORTES_DIR=/caminho/para/os/recortes   # mesmo diretório que o ingest usa (volume/cópia)
   ```
   `RECORTES_DIR` pode ser absoluto ou relativo a `apps/api`.
3. Reinicie a API. Nada mais muda: o app só faz `SELECT` em `v_questao_estudo`,
   `v_questao_alternativa`, `v_questao_topico`, `v_questao_tecnologia` e `v_questao_recorte`.

## Decisões de arquitetura

- **Contrato, não tabelas.** O módulo `ingest` da API expõe a classe abstrata `IngestRepository`
  com tipos em camelCase espelhando as colunas das views. Só `PgIngestRepository` tem SQL. Ele
  usa colunas sempre nomeadas (nunca `SELECT *`), `ORDER BY` explícito e um pool próprio com
  `default_transaction_read_only=on` e `statement_timeout`. Se o ingest cair, a API responde 503.
- **Gabarito por `gabarito_status`.** Só `ok` pontua (`avaliacao.ts`). `anulada`,
  `sem_gabarito`, `inconsistente` e qualquer valor novo não contam como acerto nem como erro.
  Essas respostas ficam registradas com `pontuavel=false, correta=null`, e a interface explica o
  motivo antes e depois de responder. `resposta_correta` só é lida quando o status é `ok`, e o
  gabarito não é enviado ao cliente antes da resposta. Gabarito preliminar é sinalizado.
- **Desempenho recalculado.** A taxa de acerto reavalia cada resposta com o gabarito
  **vigente** no ingest. Assim, se um preliminar mudar ou uma questão for anulada depois, a
  estatística acompanha. A resposta guarda um retrato do gabarito só para auditoria.
- **`questao_id` órfão.** Não há FK entre bancos. Respostas a ids que sumiram (ex.: prova
  reextraída) aparecem no histórico como "questão removida" e ficam fora da taxa de acerto,
  contadas à parte.
- **Recortes.** A API deduplica (por `recorte_id` e por arquivo) os recortes de apoio
  repetidos e coloca os de apoio primeiro. O web casa `[FIGURA n]`/`[TABELA n]` pela ordem entre
  recortes do mesmo tipo e origem. Recortes sem marcador vão depois do texto a que pertencem, e
  imagem ausente vira um aviso. As imagens saem de
  `GET /questoes/:id/recortes/:recorteId`: o caminho vem do banco (nunca da URL), o recorte
  precisa pertencer à questão e o arquivo precisa ficar dentro de `RECORTES_DIR`. São
  rejeitados `..`, caminhos absolutos, bytes nulos, symlinks para fora e extensões que não são
  imagem.
- **Auth.** E-mail e senha com hash argon2id (`@node-rs/argon2`) e JWT HS256 com expiração. A
  API é stateless e usa Bearer, então já serve um cliente nativo. Há rate limit nas rotas de
  auth e tempo constante quando o e-mail não existe.
- **BFF no web.** O navegador nunca vê o JWT. `/api/sessao` faz login e cadastro e guarda o
  token em cookie `httpOnly` + `SameSite=Lax`, e `/api/*` repassa uma lista fechada de rotas à
  API anexando o Bearer. Requisições que alteram estado precisam vir da mesma origem (CSRF). O
  `proxy.ts` do Next só redireciona quem está sem cookie para `/entrar`.
- **PWA.** Manifest, ícones e um service worker simples: assets cache-first, navegação
  network-first com fallback `/offline`, e `/api/*` nunca em cache.
- **Tipos compartilhados.** `packages/shared` só tem os DTOs HTTP, compilados para `dist`.

## Fora do escopo (por enquanto)

Plano de estudo, Anki/repetição espaçada, simulados, tutor de IA, ranking, pagamentos, app
nativo e login social. Também não há desduplicação de questões repetidas entre provas, porque o
contrato não traz a chave para isso.
