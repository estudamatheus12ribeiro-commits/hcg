-- HCG Estudos — schema inicial
-- Aplicativo privado de estudos para dois usuários (Matheus / Laura).
-- Todas as tabelas de dados pessoais são protegidas por RLS via auth.uid().

create extension if not exists pgcrypto;

-- ========== ENUMS ==========
create type area_estudo as enum ('concursos', 'medicina');
create type origem_questao as enum ('importada', 'ia', 'mista');
create type status_questao as enum ('rascunho', 'revisao_pendente', 'confirmada', 'anulada');
create type dificuldade_estimada as enum ('facil', 'media', 'dificil', 'nao_estimada');
create type tipo_arquivo_prova as enum ('prova', 'gabarito', 'edital', 'outro');
create type status_processamento as enum ('pendente', 'processando', 'extraido', 'revisao_pendente', 'confirmado', 'erro');
create type status_gabarito as enum ('ausente', 'extraoficial', 'oficial_preliminar', 'oficial_definitivo');
create type modo_bloco as enum ('estudo', 'simulado');
create type status_bloco as enum ('em_andamento', 'concluido', 'abandonado');
create type nivel_confianca as enum ('certeza', 'duvida', 'chute');
create type categoria_resultado as enum (
  'acerto_seguro', 'acerto_duvida', 'acerto_chute',
  'erro_duvida', 'erro_confianca', 'sem_resposta'
);
create type causa_provavel as enum (
  'conteudo', 'interpretacao', 'calculo', 'desatencao', 'atualizacao', 'gestao_tempo', 'nao_classificada'
);
create type status_verificacao_fonte as enum ('nao_verificada', 'verificada', 'desatualizada', 'falha');
create type tipo_pdf as enum ('bloco', 'semanal', 'assunto', 'prova', 'consolidado');
create type status_fila_revisao as enum ('pendente', 'concluida', 'adiada');
create type status_simulado as enum ('planejado', 'em_andamento', 'concluido');

-- ========== PERFIS (2 usuários fixos) ==========
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome_exibicao text not null,
  area area_estudo not null unique, -- garante 1 perfil por área (Matheus=concursos, Laura=medicina)
  criado_em timestamptz not null default now()
);

-- ========== FONTES BIBLIOGRÁFICAS ==========
create table fontes (
  id uuid primary key default gen_random_uuid(),
  area area_estudo not null,
  titulo text not null,
  instituicao text,
  url text,
  data_publicacao date,
  data_ultima_consulta timestamptz,
  status_verificacao status_verificacao_fonte not null default 'nao_verificada',
  verificacao_automatica_ativa boolean not null default false,
  intervalo_verificacao_dias int not null default 30,
  ultima_execucao_em timestamptz,
  ultima_execucao_falhou boolean not null default false,
  ultimo_erro text,
  criado_em timestamptz not null default now()
);

-- ========== PROVAS / EDITAIS IMPORTADOS ==========
create table exams (
  id uuid primary key default gen_random_uuid(),
  area area_estudo not null,
  titulo text not null,
  banca text,
  instituicao text,
  ano int,
  cargo_ou_exame text,
  tipo_caderno text,
  numero_caderno text,
  edital_url text,
  criado_por uuid references profiles(id),
  criado_em timestamptz not null default now()
);

create table exam_files (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references exams(id) on delete cascade,
  tipo tipo_arquivo_prova not null,
  storage_path text not null,
  nome_original text not null,
  status status_processamento not null default 'pendente',
  ocr_utilizado boolean not null default false,
  progresso int not null default 0,
  erro_mensagem text,
  tentativas int not null default 0,
  enviado_por uuid references profiles(id),
  criado_em timestamptz not null default now(),
  processado_em timestamptz
);

-- Trechos problemáticos identificados na extração (nunca preenchidos silenciosamente)
create table exam_extraction_flags (
  id uuid primary key default gen_random_uuid(),
  exam_file_id uuid not null references exam_files(id) on delete cascade,
  pagina int,
  tipo text not null, -- 'ilegivel' | 'imagem_ausente' | 'associacao_duvidosa' | 'outro'
  descricao text not null,
  resolvido boolean not null default false,
  criado_em timestamptz not null default now()
);

-- ========== QUESTÕES ==========
create table questions (
  id uuid primary key default gen_random_uuid(),
  area area_estudo not null,
  exam_id uuid references exams(id) on delete set null,
  exam_file_id uuid references exam_files(id) on delete set null,
  numero_no_caderno text,
  origem origem_questao not null default 'importada',
  disciplina text,
  assunto text,
  subassunto text,
  enunciado text not null,
  tem_imagem boolean not null default false,
  tipo_raciocinio text, -- ex: caso clinico, calculo, legislacao, texto
  dificuldade dificuldade_estimada not null default 'nao_estimada',
  status status_questao not null default 'rascunho',
  motivo_revisao text,
  pagina_origem int,
  gerado_por_ia_prompt text, -- guarda o contexto usado para gerar (transparência)
  gerado_por_ia_em timestamptz,
  ia_modelo text,
  criado_por uuid references profiles(id),
  criado_em timestamptz not null default now()
);

create table alternatives (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references questions(id) on delete cascade,
  letra text not null,
  texto text not null,
  imagem_path text,
  ordem int not null default 0
);

-- Histórico de versões de gabarito (nunca sobrescreve, sempre nova versão)
create table answer_keys (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references questions(id) on delete cascade,
  versao int not null,
  status status_gabarito not null default 'ausente',
  resposta_letra text,
  justificativa text,
  anulada boolean not null default false,
  resposta_alterada boolean not null default false,
  fonte_arquivo_id uuid references exam_files(id),
  fonte_pagina int,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  unique (question_id, versao)
);

create table question_sources (
  question_id uuid not null references questions(id) on delete cascade,
  fonte_id uuid not null references fontes(id) on delete cascade,
  primary key (question_id, fonte_id)
);

-- Log de recomputação quando um gabarito muda de versão
create table answer_key_recompute_log (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references questions(id) on delete cascade,
  versao_anterior int,
  versao_nova int not null,
  impacto jsonb not null default '[]'::jsonb, -- [{profile_id, attempt_id, categoria_antes, categoria_depois}]
  executado_em timestamptz not null default now()
);

-- ========== BLOCOS DE 10 QUESTÕES ==========
create table study_blocks (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  area area_estudo not null,
  exam_id uuid references exams(id),
  modo modo_bloco not null default 'estudo',
  status status_bloco not null default 'em_andamento',
  filtros jsonb not null default '{}'::jsonb, -- banca/disciplina/assunto/dificuldade/origem usados na seleção
  criado_em timestamptz not null default now(),
  finalizado_em timestamptz
);

create table block_questions (
  id uuid primary key default gen_random_uuid(),
  block_id uuid not null references study_blocks(id) on delete cascade,
  question_id uuid not null references questions(id),
  ordem int not null,
  unique (block_id, ordem)
);

create table attempts (
  id uuid primary key default gen_random_uuid(),
  block_id uuid not null references study_blocks(id) on delete cascade,
  question_id uuid not null references questions(id),
  profile_id uuid not null references profiles(id) on delete cascade,
  alternativa_escolhida_id uuid references alternatives(id),
  sem_resposta boolean not null default false,
  confianca nivel_confianca,
  tempo_ativo_segundos int,
  trocou_resposta boolean not null default false,
  anotacao text,
  answer_key_versao_utilizada int,
  categoria_resultado categoria_resultado,
  categoria_resultado_atual categoria_resultado, -- recalculada se o gabarito mudar
  causa_provavel_sugerida causa_provavel,
  causa_confirmada_pelo_usuario boolean,
  causa_provavel_final causa_provavel,
  is_primeira_tentativa boolean not null default true,
  respondido_em timestamptz not null default now()
);

create table diagnostics (
  id uuid primary key default gen_random_uuid(),
  block_id uuid not null references study_blocks(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  resumo jsonb not null default '{}'::jsonb,
  assuntos_prioritarios jsonb not null default '[]'::jsonb,
  gerado_em timestamptz not null default now()
);

-- ========== REVISÃO ESPAÇADA ==========
create table review_queue (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  disciplina text,
  assunto text,
  subassunto text,
  origem_attempt_id uuid references attempts(id),
  origem_question_id uuid references questions(id),
  motivo text not null, -- explicação de por que foi priorizado
  intervalo_dias int not null default 1,
  data_prevista date not null,
  ultima_revisao_em timestamptz,
  ultimo_resultado categoria_resultado,
  sequencia_acertos int not null default 0,
  status status_fila_revisao not null default 'pendente',
  criado_em timestamptz not null default now()
);

-- ========== PDFS ==========
create table pdfs (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  block_id uuid references study_blocks(id),
  tipo tipo_pdf not null default 'bloco',
  titulo text not null,
  storage_path text not null,
  versao int not null default 1,
  substitui_pdf_id uuid references pdfs(id),
  gerado_em timestamptz not null default now()
);

-- ========== METAS, SIMULADOS, CONFIGURAÇÕES ==========
create table goals (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  descricao text not null,
  valor_alvo numeric,
  unidade text, -- 'questoes_semana', 'dias_estudo_semana', etc.
  periodo text, -- 'semanal','mensal'
  ativa boolean not null default true,
  criado_em timestamptz not null default now()
);

create table simulados (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  titulo text not null,
  banca text,
  data_prova date,
  edital_exam_id uuid references exams(id),
  criterio_distribuicao text, -- 'edital' | 'amostra_importada' | 'manual'
  regras_pontuacao jsonb,
  tempo_limite_minutos int,
  status status_simulado not null default 'planejado',
  block_id uuid references study_blocks(id),
  criado_em timestamptz not null default now()
);

create table settings (
  profile_id uuid not null references profiles(id) on delete cascade,
  chave text not null,
  valor jsonb not null,
  atualizado_em timestamptz not null default now(),
  primary key (profile_id, chave)
);

create table ai_usage_log (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete set null,
  funcionalidade text not null, -- 'geracao_questao','diagnostico','ocr_apoio', etc.
  modelo text,
  tokens_entrada int,
  tokens_saida int,
  custo_estimado_usd numeric(10,4),
  criado_em timestamptz not null default now()
);

create table shared_dashboard_consent (
  profile_id uuid primary key references profiles(id) on delete cascade,
  opt_in boolean not null default false,
  atualizado_em timestamptz not null default now()
);

-- ========== ÍNDICES ==========
create index idx_questions_area on questions(area);
create index idx_questions_exam on questions(exam_id);
create index idx_questions_assunto on questions(disciplina, assunto);
create index idx_attempts_profile on attempts(profile_id);
create index idx_attempts_question on attempts(question_id);
create index idx_review_queue_profile_due on review_queue(profile_id, data_prevista) where status = 'pendente';
create index idx_answer_keys_question_active on answer_keys(question_id) where ativo;

-- ========== FUNÇÃO AUXILIAR: área do usuário logado ==========
create or replace function auth_area()
returns area_estudo
language sql stable
as $$
  select area from profiles where id = auth.uid();
$$;

-- ========== RLS ==========
alter table profiles enable row level security;
alter table fontes enable row level security;
alter table exams enable row level security;
alter table exam_files enable row level security;
alter table exam_extraction_flags enable row level security;
alter table questions enable row level security;
alter table alternatives enable row level security;
alter table answer_keys enable row level security;
alter table question_sources enable row level security;
alter table answer_key_recompute_log enable row level security;
alter table study_blocks enable row level security;
alter table block_questions enable row level security;
alter table attempts enable row level security;
alter table diagnostics enable row level security;
alter table review_queue enable row level security;
alter table pdfs enable row level security;
alter table goals enable row level security;
alter table simulados enable row level security;
alter table settings enable row level security;
alter table ai_usage_log enable row level security;
alter table shared_dashboard_consent enable row level security;

-- Perfis: cada um vê e edita só o próprio
create policy profiles_self on profiles for all
  using (id = auth.uid()) with check (id = auth.uid());

-- Conteúdo de referência (provas/questões/fontes) é escopado por área,
-- e cada perfil só enxerga sua própria área — nunca a área do outro usuário.
create policy fontes_area on fontes for all
  using (area = auth_area()) with check (area = auth_area());

create policy exams_area on exams for all
  using (area = auth_area()) with check (area = auth_area());

create policy exam_files_area on exam_files for all
  using (exam_id in (select id from exams where area = auth_area()))
  with check (exam_id in (select id from exams where area = auth_area()));

create policy exam_flags_area on exam_extraction_flags for all
  using (exam_file_id in (
    select ef.id from exam_files ef join exams e on e.id = ef.exam_id where e.area = auth_area()
  ));

create policy questions_area on questions for all
  using (area = auth_area()) with check (area = auth_area());

create policy alternatives_area on alternatives for all
  using (question_id in (select id from questions where area = auth_area()))
  with check (question_id in (select id from questions where area = auth_area()));

create policy answer_keys_area on answer_keys for all
  using (question_id in (select id from questions where area = auth_area()))
  with check (question_id in (select id from questions where area = auth_area()));

create policy question_sources_area on question_sources for all
  using (question_id in (select id from questions where area = auth_area()));

create policy answer_key_log_area on answer_key_recompute_log for select
  using (question_id in (select id from questions where area = auth_area()));

-- Dados pessoais (respostas, blocos, revisões, pdfs, metas...): estritamente por usuário
create policy study_blocks_self on study_blocks for all
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());

create policy block_questions_self on block_questions for all
  using (block_id in (select id from study_blocks where profile_id = auth.uid()));

create policy attempts_self on attempts for all
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());

create policy diagnostics_self on diagnostics for all
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());

create policy review_queue_self on review_queue for all
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());

create policy pdfs_self on pdfs for all
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());

create policy goals_self on goals for all
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());

create policy simulados_self on simulados for all
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());

create policy settings_self on settings for all
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());

create policy ai_usage_self on ai_usage_log for select
  using (profile_id = auth.uid());

-- Painel conjunto: cada um só vê o próprio registro de consentimento e,
-- se AMBOS optaram, pode ver constância do outro (checado na aplicação).
create policy shared_consent_self on shared_dashboard_consent for all
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());

create policy shared_consent_read_both on shared_dashboard_consent for select
  using (
    exists (select 1 from shared_dashboard_consent c where c.profile_id = auth.uid() and c.opt_in)
  );
