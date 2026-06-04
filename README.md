# hcg# 🫀 ECG do Zero — Aula Interativa

Uma aula de eletrocardiograma **visual, prática e 100% interativa**, em um único arquivo HTML. Sem decoreba: você *vê* a eletricidade do coração virar onda, mede, calcula a frequência e reconhece ritmos — clicando em tudo, no estilo de um monitor cardíaco.

---

## ▶️ Como abrir

Não precisa instalar nada. É um arquivo independente.

1. Baixe o arquivo `aula-ecg.html`.
2. Dê **dois cliques** nele — abre no seu navegador (Chrome, Edge, Firefox, Safari…).
3. Pronto. Funciona offline, no celular e no computador.

> Precisa de internet apenas no primeiro carregamento das fontes; depois roda sem conexão.

---

## 🗺️ O que você vai aprender (8 módulos)

| Nº | Módulo | O que faz aqui |
|----|--------|----------------|
| 00 | **Bem-vindo** | A ideia central que destrava o ECG inteiro |
| 01 | **O coração é elétrico** | Animação da faísca percorrendo nó SA → AV → His → Purkinje |
| 02 | **P, QRS e T** | Clique em cada parte da onda e descubra o que ela significa |
| 03 | **O papel quadriculado** | A "régua" do ECG: tempo (0,04 s) e voltagem (0,1 mV) |
| 04 | **Frequência cardíaca** | Arraste o controle e veja os bpm e os 3 métodos de cálculo ao vivo |
| 05 | **As 12 derivações** | Clique em cada "câmera" e veja qual parede do coração ela filma |
| 06 | **Leitura sistemática** | O roteiro fixo de 5 passos para ler qualquer ECG |
| 07 | **Banco de ritmos** | Traçados animados: do sinusal normal ao infarto, FV e assistolia |
| 08 | **Pratique** | Quiz de 6 casos com correção explicada |

A sequência vai do **básico ao avançado** — recomendo seguir a ordem na primeira vez.

---

## 🖱️ Controles e interações

- **Barra de navegação no topo** — pule para qualquer módulo a qualquer momento.
- **Setas ← →** do teclado — avança e volta entre os módulos.
- **Botões ▶ / ↻** (Módulo 1) — animam e repetem a batida do coração.
- **Clique na onda** (Módulo 2) — toque em P, QRS, ST ou T para explicações.
- **Controle deslizante** (Módulo 4) — muda a distância entre batidas e recalcula a frequência em tempo real.
- **Banco de ritmos** (Módulo 7) — alterne entre ritmos; os perigosos acendem o **alarme vermelho**.
- **Quiz** (Módulo 8) — escolha a resposta e receba feedback na hora.

---

## 🧠 A grande sacada do ECG

> A eletricidade vindo **na direção** de um eletrodo → o traçado **sobe**.
> A eletricidade **se afastando** → o traçado **desce**.

Esse único princípio explica a maior parte de tudo o que você verá no curso.

---

## 🩺 Ritmos incluídos no banco

**Normais / leves:** Sinusal normal · Taquicardia sinusal · Bradicardia sinusal
**Importantes:** Fibrilação atrial · Flutter atrial · Extrassístole ventricular (PVC) · Bloqueio AV total
**Emergências:** Infarto com supra de ST (STEMI) · Fibrilação ventricular (FV) · Assistolia

Cada um vem com traçado animado e a lista dos **sinais-chave** para reconhecê-lo.

---

## 🛠️ Detalhes técnicos

- **Tecnologia:** HTML + CSS + JavaScript puro (sem bibliotecas externas, sem build).
- **Traçados:** gerados por código — um gerador de ondas PQRST desenha cada batimento, o que permite criar e variar ritmos facilmente.
- **Fontes:** Bricolage Grotesque, IBM Plex Mono e Sora (via Google Fonts).
- **Tema:** estética de monitor cardíaco (fósforo verde sobre fundo escuro; papel quadriculado rosa real).
- **Compatibilidade:** qualquer navegador moderno; layout responsivo para celular.

### Quer personalizar?

Tudo está em um arquivo só. Pontos úteis para mexer:

- `MODULES` — lista de módulos (título, ícone, número).
- `function beat(opts)` — molda um batimento (altura do R, presença de P, ST elevado, QRS largo…).
- `const rhythms` (Módulo 7) e `const questions` (Módulo 8) — adicione novos ritmos e perguntas.
- Bloco `:root` no CSS — todas as cores em variáveis, fácil de re-tematizar.

---

## ⚠️ Aviso importante

Este é um **material educativo** para aprender os conceitos de ECG. Os traçados são simplificações didáticas geradas por código. **Não substitui** avaliação médica, treinamento clínico formal nem a interpretação de um ECG real de paciente. Decisões clínicas exigem o traçado completo (12 derivações), o contexto e o exame do paciente por um profissional habilitado.

---

*Feito para aprender clicando. 💚*
