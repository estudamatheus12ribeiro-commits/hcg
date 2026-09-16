import type { Enums } from "@/lib/supabase/types";

type Categoria = Enums<"categoria_resultado">;

// Regra inicial do sistema (configurável em Configurações).
export const INTERVALOS_PADRAO_DIAS = [1, 3, 7, 14, 30];

/**
 * Calcula o próximo intervalo de revisão a partir do desempenho.
 * Erros e chutes encurtam o intervalo; acertos seguros repetidos o alongam,
 * respeitando a progressão configurada.
 */
export function proximoIntervalo(params: {
  intervaloAtualDias: number;
  categoria: Categoria;
  sequenciaAcertos: number;
  intervalos?: number[];
}): { intervaloDias: number; sequenciaAcertos: number } {
  const intervalos = params.intervalos ?? INTERVALOS_PADRAO_DIAS;
  const idxAtual = Math.max(
    0,
    intervalos.findIndex((d) => d >= params.intervaloAtualDias),
  );

  const acertoForte = params.categoria === "acerto_seguro";
  const falhaOuDuvida = [
    "erro_duvida",
    "erro_confianca",
    "acerto_chute",
    "sem_resposta",
  ].includes(params.categoria);

  if (acertoForte) {
    const seq = params.sequenciaAcertos + 1;
    const proximoIdx = Math.min(idxAtual + 1, intervalos.length - 1);
    return { intervaloDias: intervalos[proximoIdx], sequenciaAcertos: seq };
  }

  if (falhaOuDuvida) {
    // volta para o início da progressão — erro de alta confiança some volta ao dia 1
    const recuo = params.categoria === "erro_confianca" ? 0 : Math.max(0, idxAtual - 1);
    return { intervaloDias: intervalos[recuo], sequenciaAcertos: 0 };
  }

  // acerto_duvida: mantém o intervalo atual (não comprova retenção ainda)
  return { intervaloDias: intervalos[idxAtual], sequenciaAcertos: params.sequenciaAcertos };
}

export function explicarPriorizacao(params: {
  categoria: Categoria;
  disciplina: string | null;
  assunto: string | null;
}): string {
  const assunto = params.assunto ? `"${params.assunto}"` : "este assunto";
  switch (params.categoria) {
    case "erro_confianca":
      return `Priorizado porque houve erro com alta confiança em ${assunto} — indício de conceito consolidado de forma incorreta.`;
    case "erro_duvida":
      return `Priorizado porque houve erro com dúvida em ${assunto} — conteúdo ainda não consolidado.`;
    case "acerto_chute":
      return `Priorizado porque o acerto em ${assunto} foi por chute — não comprova domínio.`;
    case "acerto_duvida":
      return `Priorizado porque o acerto em ${assunto} veio acompanhado de insegurança.`;
    case "sem_resposta":
      return `Priorizado porque a questão de ${assunto} ficou sem resposta.`;
    default:
      return `Revisão de consolidação de ${assunto}.`;
  }
}
