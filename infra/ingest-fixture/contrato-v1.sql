-- Reprodução LOCAL do contrato de leitura v1 do provas-ti-ingest
-- (provas-ti-ingest/docs/contrato-app.md). Usado em desenvolvimento e nos testes.
--
-- As tabelas fx_* são só suporte da fixture (no ingest real as tabelas base são outras e
-- o app NÃO tem acesso a elas). O que importa é o formato das views v_questao_*: mesmos
-- nomes, tipos e significado de colunas do contrato.

CREATE TABLE fx_questao_estudo (
  questao_id                integer PRIMARY KEY,
  prova_id                  integer NOT NULL,
  banca                     text    NOT NULL,
  orgao                     text    NOT NULL,
  ano                       integer,
  cargo                     text    NOT NULL,
  area_prova                text,
  tipo_caderno              text,
  numero                    integer NOT NULL,
  tipo_item                 text    NOT NULL,
  enunciado                 text,
  texto_apoio               text,
  gabarito_status           text    NOT NULL,
  resposta_correta          text,
  gabarito_versao           text,
  tipo_cobranca             text,
  tipo_cobranca_confianca   double precision,
  nivel_cognitivo           text,
  nivel_cognitivo_confianca double precision,
  norma_referencia          text,
  classificada              boolean NOT NULL DEFAULT false,
  tem_recorte               boolean NOT NULL DEFAULT false
);

CREATE TABLE fx_questao_alternativa (
  questao_id integer NOT NULL REFERENCES fx_questao_estudo ON DELETE CASCADE,
  letra      text    NOT NULL,
  texto      text    NOT NULL,
  PRIMARY KEY (questao_id, letra)
);

CREATE TABLE fx_questao_topico (
  questao_id integer NOT NULL REFERENCES fx_questao_estudo ON DELETE CASCADE,
  area_id    integer NOT NULL,
  area       text    NOT NULL,
  topico_id  integer NOT NULL,
  topico     text    NOT NULL,
  principal  boolean NOT NULL DEFAULT false,
  confianca  double precision,
  PRIMARY KEY (questao_id, topico_id)
);

CREATE TABLE fx_questao_tecnologia (
  questao_id    integer NOT NULL REFERENCES fx_questao_estudo ON DELETE CASCADE,
  tecnologia_id integer NOT NULL,
  tecnologia    text    NOT NULL,
  categoria     text    NOT NULL,
  confianca     double precision,
  PRIMARY KEY (questao_id, tecnologia_id)
);

CREATE TABLE fx_questao_recorte (
  questao_id        integer NOT NULL REFERENCES fx_questao_estudo ON DELETE CASCADE,
  recorte_id        integer NOT NULL,
  origem            text    NOT NULL,
  letra_alternativa text,
  tipo              text    NOT NULL,
  pagina            integer NOT NULL,
  caminho_relativo  text    NOT NULL,
  ordem             integer NOT NULL,
  PRIMARY KEY (questao_id, recorte_id)
);

CREATE VIEW v_questao_estudo AS
SELECT questao_id, prova_id, banca, orgao, ano, cargo, area_prova, tipo_caderno, numero,
       tipo_item, enunciado, texto_apoio, gabarito_status, resposta_correta, gabarito_versao,
       tipo_cobranca, tipo_cobranca_confianca, nivel_cognitivo, nivel_cognitivo_confianca,
       norma_referencia, classificada, tem_recorte
  FROM fx_questao_estudo;

CREATE VIEW v_questao_alternativa AS
SELECT questao_id, letra, texto FROM fx_questao_alternativa;

CREATE VIEW v_questao_topico AS
SELECT questao_id, area_id, area, topico_id, topico, principal, confianca FROM fx_questao_topico;

CREATE VIEW v_questao_tecnologia AS
SELECT questao_id, tecnologia_id, tecnologia, categoria, confianca FROM fx_questao_tecnologia;

CREATE VIEW v_questao_recorte AS
SELECT questao_id, recorte_id, origem, letra_alternativa, tipo, pagina, caminho_relativo, ordem
  FROM fx_questao_recorte;
