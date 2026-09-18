import type { Enums } from "@/lib/supabase/types";

type Categoria = Enums<"categoria_resultado">;
type Confianca = Enums<"nivel_confianca">;
type Causa = Enums<"causa_provavel">;

/**
 * Classifica o resultado de uma tentativa nas 6 categorias exigidas:
 * acerto seguro, acerto com dúvida, acerto por chute,
 * erro com dúvida, erro com alta confiança, sem resposta.
 * Acerto por chute NUNCA é tratado como domínio comprovado (fica marcado à parte).
 */
export function classificarResultado(params: {
  semResposta: boolean;
  correta: boolean | null; // null = gabarito ainda ausente
  confianca: Confianca | null;
}): Categoria | null {
  const { semResposta, correta, confianca } = params;
  if (semResposta) return "sem_resposta";
  if (correta === null) return null; // sem gabarito ainda: não inventa resultado

  if (correta) {
    if (confianca === "certeza") return "acerto_seguro";
    if (confianca === "chute") return "acerto_chute";
    return "acerto_duvida"; // duvida ou não informado
  }
  if (confianca === "certeza") return "erro_confianca";
  return "erro_duvida";
}

/**
 * Sugere uma causa provável a partir de sinais observáveis — nunca afirmada
 * como certa; o usuário sempre pode confirmar ou corrigir.
 */
export function sugerirCausaProvavel(params: {
  categoria: Categoria | null;
  tempoAtivoSegundos: number | null;
  tempoMedianoSegundos: number | null;
  trocouResposta: boolean;
  gabaritoAlterado: boolean;
}): Causa {
  const { categoria, tempoAtivoSegundos, tempoMedianoSegundos, trocouResposta, gabaritoAlterado } =
    params;

  if (gabaritoAlterado) return "atualizacao";
  if (categoria === "acerto_seguro" || categoria === null) return "nao_classificada";

  if (tempoAtivoSegundos != null && tempoMedianoSegundos != null) {
    if (tempoAtivoSegundos < tempoMedianoSegundos * 0.4) return "desatencao";
    if (tempoAtivoSegundos > tempoMedianoSegundos * 2.2) return "gestao_tempo";
  }
  if (trocouResposta && (categoria === "erro_duvida" || categoria === "erro_confianca")) {
    return "interpretacao";
  }
  if (categoria === "erro_confianca") return "conteudo";
  if (categoria === "erro_duvida") return "conteudo";
  return "nao_classificada";
}

export const ROTULOS_CATEGORIA: Record<Categoria, string> = {
  acerto_seguro: "Acerto com segurança",
  acerto_duvida: "Acerto com dúvida",
  acerto_chute: "Acerto por chute",
  erro_duvida: "Erro com dúvida",
  erro_confianca: "Erro com alta confiança",
  sem_resposta: "Sem resposta",
};

export const ROTULOS_CAUSA: Record<Causa, string> = {
  conteudo: "Conteúdo não dominado",
  interpretacao: "Interpretação do enunciado",
  calculo: "Erro de cálculo",
  desatencao: "Desatenção",
  atualizacao: "Mudança de gabarito/atualização",
  gestao_tempo: "Gestão de tempo",
  nao_classificada: "Não classificada",
};
