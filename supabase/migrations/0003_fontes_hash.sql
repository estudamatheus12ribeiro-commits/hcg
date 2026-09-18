-- Guarda o hash do último conteúdo verificado, para detectar mudanças entre execuções do cron.
alter table fontes add column if not exists ultimo_hash_conteudo text;
