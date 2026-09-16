import type { Tables } from "@/lib/supabase/types";

export const AMOSTRA_MINIMA = 8; // abaixo disso, sinalizar "amostra insuficiente"

export type Metrica = {
  acertos: number;
  invalidas: number; // sem gabarito confirmado, fora da contagem
  total: number; // denominador válido (respondidas com gabarito)
  percentual: number | null;
  amostraInsuficiente: boolean;
};

export function calcularMetrica(attempts: Array<{
  categoria_resultado_atual: string | null;
  categoria_resultado: string | null;
}>): Metrica {
  let acertos = 0;
  let invalidas = 0;
  let total = 0;

  for (const a of attempts) {
    const cat = a.categoria_resultado_atual ?? a.categoria_resultado;
    if (cat === null) {
      invalidas++;
      continue;
    }
    total++;
    if (cat === "acerto_seguro" || cat === "acerto_duvida" || cat === "acerto_chute") {
      acertos++;
    }
  }

  return {
    acertos,
    invalidas,
    total,
    percentual: total > 0 ? Math.round((acertos / total) * 1000) / 10 : null,
    amostraInsuficiente: total < AMOSTRA_MINIMA,
  };
}

export function agruparPor<T, K extends string>(
  items: T[],
  key: (item: T) => K | null,
): Record<string, T[]> {
  const out: Record<string, T[]> = {};
  for (const item of items) {
    const k = key(item) ?? "(não classificado)";
    (out[k] ??= []).push(item);
  }
  return out;
}

export function medianaSegundos(valores: number[]): number | null {
  if (valores.length === 0) return null;
  const ordenado = [...valores].sort((a, b) => a - b);
  const meio = Math.floor(ordenado.length / 2);
  if (ordenado.length % 2 === 0) {
    return Math.round((ordenado[meio - 1] + ordenado[meio]) / 2);
  }
  return ordenado[meio];
}

export type AttemptRow = Tables<"attempts">;
