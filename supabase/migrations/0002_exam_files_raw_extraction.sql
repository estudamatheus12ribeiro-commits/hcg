-- Guarda o resultado bruto da extração (texto/paginas parseadas) para que a
-- tela de revisão sobreviva a reloads sem precisar reprocessar o arquivo.
alter table exam_files add column if not exists extracao_bruta jsonb;
