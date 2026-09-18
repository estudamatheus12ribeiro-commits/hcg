export type AlternativaExtraida = {
  letra: string;
  texto: string;
};

export type QuestaoExtraida = {
  numeroNoCaderno: string;
  enunciado: string;
  alternativas: AlternativaExtraida[];
  pagina: number;
  confiancaExtracao: "alta" | "baixa"; // baixa => precisa de revisão manual antes de confirmar
  motivosRevisao: string[];
};

const RE_INICIO_QUESTAO = /^(?:QUEST(?:ÃO|AO)\s*)?0*(\d{1,3})[.\-–:)]\s+(.*)$/i;
const RE_ALTERNATIVA = /^\(?([A-E])\)?[.\-–:)]\s+(.*)$/;

/**
 * Segmenta o texto extraído em questões e alternativas usando os padrões
 * numéricos mais comuns de provas brasileiras. É heurístico por natureza —
 * cada questão resultante carrega uma marca de confiança e motivos de revisão,
 * nunca é apresentada como conferida automaticamente.
 */
export function extrairQuestoesDoTexto(paginas: { pagina: number; texto: string }[]): QuestaoExtraida[] {
  const questoes: QuestaoExtraida[] = [];
  let atual: QuestaoExtraida | null = null;
  let modo: "enunciado" | "alternativas" = "enunciado";

  const finalizar = () => {
    if (!atual) return;
    const motivos: string[] = [];
    if (atual.alternativas.length < 2) motivos.push("Menos de 2 alternativas identificadas");
    if (atual.alternativas.length > 6) motivos.push("Mais de 6 alternativas identificadas (possível erro de segmentação)");
    if (atual.enunciado.trim().length < 15) motivos.push("Enunciado muito curto — possível corte incorreto");
    const letras = atual.alternativas.map((a) => a.letra);
    if (new Set(letras).size !== letras.length) motivos.push("Letras de alternativa duplicadas");

    atual.motivosRevisao = motivos;
    atual.confiancaExtracao = motivos.length === 0 ? "alta" : "baixa";
    questoes.push(atual);
  };

  for (const { pagina, texto } of paginas) {
    const linhas = texto.split(/\r?\n/);
    for (const linhaBruta of linhas) {
      const linha = linhaBruta.trim();
      if (!linha) continue;

      const inicioQuestao = linha.match(RE_INICIO_QUESTAO);
      if (inicioQuestao) {
        finalizar();
        atual = {
          numeroNoCaderno: inicioQuestao[1],
          enunciado: inicioQuestao[2],
          alternativas: [],
          pagina,
          confiancaExtracao: "baixa",
          motivosRevisao: [],
        };
        modo = "enunciado";
        continue;
      }

      if (!atual) continue; // texto antes da primeira questão detectada (capa, instruções etc.)

      const alt = linha.match(RE_ALTERNATIVA);
      if (alt) {
        modo = "alternativas";
        atual.alternativas.push({ letra: alt[1].toUpperCase(), texto: alt[2] });
        continue;
      }

      if (modo === "enunciado") {
        atual.enunciado += (atual.enunciado ? " " : "") + linha;
      } else {
        // continuação de uma alternativa (quebra de linha no meio do texto)
        const ultima = atual.alternativas[atual.alternativas.length - 1];
        if (ultima) ultima.texto += " " + linha;
      }
    }
  }
  finalizar();
  return questoes;
}
