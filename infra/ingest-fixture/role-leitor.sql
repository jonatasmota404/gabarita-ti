-- Cria/atualiza um role somente leitura com SELECT apenas nas views v_*, como o
-- `provas_ti_ingest.role_leitor` faz no banco real. Rodar com psql conectado ao banco da
-- fixture, passando as variáveis: -v leitor=app_leitor -v senha=... -v banco=...
SELECT format('CREATE ROLE %I LOGIN', :'leitor')
 WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = :'leitor') \gexec
SELECT format('ALTER ROLE %I WITH LOGIN PASSWORD %L', :'leitor', :'senha') \gexec
SELECT format('ALTER ROLE %I SET default_transaction_read_only = on', :'leitor') \gexec
SELECT format('GRANT CONNECT ON DATABASE %I TO %I', :'banco', :'leitor') \gexec
SELECT format('GRANT USAGE ON SCHEMA public TO %I', :'leitor') \gexec
SELECT format('REVOKE ALL ON ALL TABLES IN SCHEMA public FROM %I', :'leitor') \gexec
SELECT format('GRANT SELECT ON %I TO %I', c.relname, :'leitor')
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
 WHERE n.nspname = 'public' AND c.relkind = 'v' AND c.relname LIKE 'v\_%' \gexec
