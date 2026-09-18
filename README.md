# HCG Estudos

Aplicativo privado de estudos por questões, com diagnóstico de dificuldades,
caderno de erros em PDF e revisão espaçada — uso exclusivo de **Matheus**
(aba "Concursos") e **Laura** (aba "Medicina"). Não há cadastro público.

Inspirado nos princípios públicos do Hospital Questiona (aprendizagem por
questões, caderno de erros, diagnóstico de dificuldades), com identidade
visual, textos e lógica próprios.

## Stack e arquitetura

- **Next.js 16 (App Router) + TypeScript + Tailwind v4** — front-end e API routes no mesmo app.
- **Supabase** (Postgres + Auth + Storage) — banco de dados persistente, autenticação e arquivos privados.
  Projeto dedicado já provisionado: `hcg-estudos` (`xqxjodxjwzrkmhonuivq`), plano gratuito.
- **RLS (Row Level Security)** em todas as tabelas: cada perfil só enxerga sua
  própria área (`concursos`/`medicina`) e seus próprios dados pessoais
  (respostas, blocos, revisões, PDFs, metas). Verificado diretamente no banco
  simulando as duas contas (ver seção "O que foi validado").
- **pdfkit** — geração real de PDF (texto selecionável/pesquisável, A4).
- **pdf-parse** — extração de texto de PDFs nativos.
- **tesseract.js** — OCR de imagens (páginas escaneadas exportadas como JPG/PNG).
- **@anthropic-ai/sdk (Claude)** — geração de questões inéditas e explicações do caderno de erros, só no servidor. Sem `ANTHROPIC_API_KEY`, o sistema continua funcionando (import manual, banco de questões, blocos, PDFs, estatísticas, revisão) e apenas os recursos de IA ficam desativados com aviso claro.

## Como rodar localmente

```bash
npm install
cp .env.example .env.local   # já vem com URL e chave anônima do projeto Supabase dedicado
npm run dev
```

Acesse `http://localhost:3000/login`.

### Contas (sem cadastro público)

Dois usuários fixos já foram criados no Supabase Auth do projeto (e-mails
internos `matheus@hcg.local` e `laura@hcg.local`). As senhas iniciais foram
geradas aleatoriamente e enviadas fora deste repositório (na conversa que
gerou este projeto) — nunca são commitadas em texto puro. Troque-as assim que
possível em **Configurações → Trocar senha**, ou redefina diretamente pelo
Supabase Dashboard (Authentication → Users) se as tiver perdido.

## Fluxo central (o que já funciona de ponta a ponta)

1. **Importar uma prova** (`/provas/importar`): envia PDF da prova e, opcionalmente, gabarito separado.
2. **Conferir a extração** (`/provas/[id]`): tela de revisão mostra cada questão extraída com nível de confiança e motivo de revisão; nada é confirmado automaticamente. PDFs sem camada de texto (escaneados) são sinalizados — este ambiente não rasteriza PDF em imagem, então páginas escaneadas devem ser reenviadas como JPG/PNG para OCR (tesseract.js).
3. **Resolver dez questões** (`/bloco/novo` → `/bloco/[id]`): escolhe prova/disciplina/assunto/dificuldade/origem e modo (estudo ou simulado); cada resposta registra confiança (certeza/dúvida/chute), tempo ativo e trocas de alternativa.
4. **Registrar confiança e calcular resultado**: classificação em 6 categorias (acerto seguro, acerto com dúvida, acerto por chute, erro com dúvida, erro com alta confiança, sem resposta) — nunca inventa correção quando o gabarito está ausente.
5. **Gerar PDF personalizado** (`/bloco/[id]/resultado` e `/pdfs`): caderno de erros real, com estrutura "erro → conceito → como reconhecer", perguntas de recuperação ativa, fontes e status de verificação.
6. **Agendar revisão** (`/revisoes`): fila de revisão espaçada com intervalos iniciais configuráveis (1, 3, 7, 14, 30 dias), reajustados pelo desempenho, com a razão da priorização explicada.

Depois disso, também funcionam: geração de questões inéditas por IA com
análise de incidência transparente (`/questoes`), estatísticas com
numerador/denominador reais e aviso de amostra insuficiente (`/desempenho`),
simulados com distribuição por edital importado (`/simulados`), fontes com
verificação periódica configurável (`/configuracoes`), painel conjunto opt-in
de constância (não compara notas), export/backup completo dos dados em JSON.

## O que foi validado nesta entrega

Este ambiente de execução (sandbox) **bloqueia por política de rede o acesso
direto** (navegador, `curl`, `fetch`) ao host do projeto Supabase — só o canal
dedicado do MCP consegue falar com ele. Por isso, a validação foi feita assim:

- **Schema, RLS e dados**: aplicados e verificados diretamente no Postgres via
  MCP, inclusive simulando as duas contas (`set_config('request.jwt.claims', ...)`
  + `set role authenticated`) para confirmar que Laura não enxerga nenhuma
  linha de `exams`/`questions` da área de Matheus (e vice-versa), e que cada
  perfil só vê a própria linha em `profiles`.
- **Lógica de negócio pura** (classificação de resultado, causa provável,
  revisão espaçada, estatísticas com amostra mínima, parser de questões e de
  gabarito, análise de incidência): testada localmente sem rede, todos os
  casos passaram.
- **Geração de PDF real**: gerado localmente com `pdfkit`, confirmado que é
  `%PDF` válido, com texto selecionável (extraído e conferido) e layout
  correto — um bug de caractere (seta Unicode não suportada pela fonte
  padrão) foi encontrado e corrigido nesse processo.
- **Build de produção** (`npm run build`) e `eslint` limpos.
- **Não validado nesta sessão** (por causa do bloqueio de rede, não por
  limitação do app): o fluxo clicado de ponta a ponta no navegador contra o
  Supabase real (login → responder bloco → PDF → revisão). O código do fluxo
  é o mesmo testado em partes acima; recomenda-se um clique manual assim que
  o app estiver rodando com acesso normal à internet (localmente ou já
  implantado) — comece pela prova de demonstração já carregada (veja abaixo).

Foi inserida uma prova de exemplo, claramente identificada, para permitir
testar o primeiro bloco sem precisar importar um PDF antes:
**"[DEMONSTRAÇÃO] Simulado de Direito Constitucional"** (12 questões
confirmadas com gabarito, área Concursos/Matheus). Nenhuma resposta foi
simulada — os dados de desempenho continuam vazios até o uso real.

## Configurações externas pendentes (para uso real e implantação)

1. **Implantar o Next.js** em algum host (Vercel, um VPS, etc.) — este
   ambiente é só de desenvolvimento/sessão e não fica no ar depois que a
   sessão termina. Configure lá as variáveis de `.env.example`.
2. **`ANTHROPIC_API_KEY`** (opcional, mas necessária para os recursos de IA):
   geração de questões inéditas e explicações automáticas do caderno de
   erros. Sem ela, essas telas mostram aviso e o restante do app funciona
   normalmente com conteúdo baseado só no que foi cadastrado manualmente.
3. **`SUPABASE_SERVICE_ROLE_KEY`** (opcional): só é usada pela rotina de
   verificação periódica de fontes (`/api/cron/verificar-fontes`). Pegue em
   Supabase Dashboard → Project Settings → API. Nunca exponha no navegador.
4. **`CRON_SECRET`**: defina um valor forte e configure um agendador externo
   (cron do host, GitHub Actions, Vercel Cron etc.) para chamar
   `POST /api/cron/verificar-fontes` periodicamente com
   `Authorization: Bearer <CRON_SECRET>`. Sem isso, a verificação automática
   de fontes cadastradas em Configurações não roda sozinha (mas pode ser
   marcada manualmente como verificada a qualquer momento).
5. **Custos**: o projeto Supabase está no plano gratuito (US$0/mês no
   provisionamento). Uso de IA tem custo por token, estimado e registrado em
   `ai_usage_log`; configure um limite mensal em Configurações. Nunca é
   prometido funcionamento 100% gratuito indefinidamente — depende dos
   limites do plano Supabase e do uso de IA.
6. **OCR de PDFs escaneados**: este código não rasteriza PDF em imagem
   (exigiria um binário como poppler/GraphicsMagick, indisponível aqui). Para
   provas totalmente escaneadas, exporte as páginas como JPG/PNG e envie-as —
   o OCR (tesseract.js) roda sobre elas normalmente.

## Limitações conhecidas / decisões assumidas

- Cobertura de edital (seção 10 do pedido) ainda não tem uma tela dedicada de
  "% do edital coberto"; a distribuição por edital já é usada para montar
  simulados (`/simulados`), mas falta o indicador de cobertura acumulada.
- A extração de questões por regex é heurística (cobre a maioria dos formatos
  numerados comuns de provas brasileiras) — sempre passa pela tela de revisão
  antes de contar para qualquer estatística.
- Um único gabarito por vez é aplicado a questões já **confirmadas** com o
  mesmo número dentro da mesma prova; correspondência ambígua (mais de uma
  questão com o mesmo número) é sinalizada e não aplicada automaticamente.

## Estrutura do projeto

```
src/app/(app)/…       páginas autenticadas (Início, Concursos, Medicina, Banco de questões,
                       Provas, Caderno de erros, PDFs, Revisões, Simulados, Desempenho, Configurações)
src/app/api/…          rotas de servidor (blocos, importação, gabarito, IA, PDFs, cron, export)
src/lib/domain/…       regras de negócio puras (classificação, revisão espaçada, estatísticas)
src/lib/extraction/…   extração de texto, OCR e parsers de questão/gabarito
src/lib/ai/…           integração com Claude (geração de questões e explicações)
src/lib/pdf/…          geração do caderno de erros em PDF
src/lib/supabase/…     clientes Supabase (browser, servidor, admin) e tipos gerados do banco
supabase/migrations/…  histórico de migrações SQL aplicadas ao projeto
```

## Legado

O arquivo `aula-ecg.html` (aula interativa de ECG, não relacionada a este
sistema) foi preservado em `app-legacy/`.
