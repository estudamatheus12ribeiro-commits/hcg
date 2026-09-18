export type GabaritoExtraido = {
  numeroNoCaderno: string;
  respostaLetra: string | null; // null = anulada ou ambígua
  anulada: boolean;
  confianca: "alta" | "baixa";
};

// Cobre formatos comuns: "1 - A", "01. B", "Questão 3: C", "3\tD", "3;E"
const RE_LINHA_GABARITO =
  /(?:QUEST(?:ÃO|AO)\s*)?0*(\d{1,3})\s*[-.:\t;)]+\s*([A-E]|ANULADA|ANUL\.?|X)\b/gi;

export function extrairGabaritoDoTexto(texto: string): GabaritoExtraido[] {
  const resultados: GabaritoExtraido[] = [];
  const vistos = new Set<string>();

  for (const match of texto.matchAll(RE_LINHA_GABARITO)) {
    const numero = match[1];
    const valor = match[2].toUpperCase();
    if (vistos.has(numero)) continue; // primeira ocorrência prevalece; duplicidade sinalizada à parte
    vistos.add(numero);

    const anulada = valor.startsWith("ANUL") || valor === "X";
    resultados.push({
      numeroNoCaderno: numero,
      respostaLetra: anulada ? null : valor,
      anulada,
      confianca: /^[A-E]$/.test(valor) || anulada ? "alta" : "baixa",
    });
  }

  return resultados;
}
