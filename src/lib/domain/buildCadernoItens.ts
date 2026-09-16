import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Enums } from "@/lib/supabase/types";
import { gerarConteudoCaderno } from "@/lib/ai/explainForCaderno";
import type { ItemCadernoPdf } from "@/lib/pdf/cadernoDeErros";

type Cliente = SupabaseClient<Database>;

export const CATEGORIAS_QUE_GERAM_REVISAO: Enums<"categoria_resultado">[] = [
  "erro_duvida",
  "erro_confianca",
  "acerto_chute",
  "acerto_duvida",
  "sem_resposta",
];

type AttemptComQuestao = {
  id: string;
  question_id: string;
  categoria_resultado: Enums<"categoria_resultado"> | null;
  categoria_resultado_atual?: Enums<"categoria_resultado"> | null;
  causa_provavel_sugerida: Enums<"causa_provavel"> | null;
  alternativa_escolhida_id: string | null;
  answer_key_versao_utilizada: number | null;
  questions:
    | { id: string; disciplina: string | null; assunto: string | null; enunciado: string; numero_no_caderno: string | null }
    | null;
};

export type Grupo = {
  disciplina: string | null;
  assunto: string | null;
  attempts: AttemptComQuestao[];
};

export function agruparAttemptsParaRevisao(attempts: AttemptComQuestao[]): Map<string, Grupo> {
  const paraRevisao = attempts.filter((a) => {
    const cat = a.categoria_resultado_atual ?? a.categoria_resultado;
    return cat && CATEGORIAS_QUE_GERAM_REVISAO.includes(cat);
  });

  const grupos = new Map<string, Grupo>();
  for (const a of paraRevisao) {
    const chave = `${a.questions?.disciplina ?? ""}::${a.questions?.assunto ?? ""}`;
    if (!grupos.has(chave)) {
      grupos.set(chave, { disciplina: a.questions?.disciplina ?? null, assunto: a.questions?.assunto ?? null, attempts: [] });
    }
    grupos.get(chave)!.attempts.push(a);
  }
  return grupos;
}

export async function construirItensCaderno(
  supabase: Cliente,
  grupos: Map<string, Grupo>,
  area: Enums<"area_estudo">,
): Promise<{ itens: ItemCadernoPdf[]; assuntosPrioritarios: string[]; tokensEntrada: number; tokensSaida: number }> {
  const itens: ItemCadernoPdf[] = [];
  const assuntosPrioritarios: string[] = [];
  let tokensEntrada = 0;
  let tokensSaida = 0;

  for (const grupo of grupos.values()) {
    assuntosPrioritarios.push(grupo.assunto || grupo.disciplina || "Assunto não classificado");
    const representante = grupo.attempts[0];
    const questaoRep = representante.questions!;

    const { data: alternativas } = await supabase
      .from("alternatives")
      .select("*")
      .eq("question_id", questaoRep.id)
      .order("ordem");

    const { data: gabarito } = await supabase
      .from("answer_keys")
      .select("*")
      .eq("question_id", questaoRep.id)
      .eq("versao", representante.answer_key_versao_utilizada ?? -1)
      .maybeSingle();

    const { data: fontesLinks } = await supabase
      .from("question_sources")
      .select("fontes(titulo, instituicao, data_ultima_consulta, status_verificacao)")
      .eq("question_id", questaoRep.id);

    const alternativaEscolhida = alternativas?.find((alt) => alt.id === representante.alternativa_escolhida_id);
    const alternativaCorreta = alternativas?.find((alt) => alt.letra === gabarito?.resposta_letra);

    let conteudo;
    try {
      conteudo = await gerarConteudoCaderno({
        area,
        disciplina: grupo.disciplina,
        assunto: grupo.assunto,
        enunciado: questaoRep.enunciado,
        alternativas: (alternativas ?? []).map((a) => ({ letra: a.letra, texto: a.texto })),
        respostaCorretaLetra: gabarito?.resposta_letra ?? null,
        justificativaGabarito: gabarito?.justificativa ?? null,
        alternativaEscolhidaLetra: alternativaEscolhida?.letra ?? null,
      });
    } catch {
      conteudo = {
        explicacao: "Não foi possível gerar a explicação automática (falha ao chamar a IA). Revise manualmente.",
        resumoTeorico: "Indisponível.",
        perguntaRecuperacao: `Revise o conceito de ${grupo.assunto ?? grupo.disciplina ?? "este tema"}.`,
        respostaRecuperacao: "Ver material da questão.",
        geradoPorIa: false,
      };
    }
    if (conteudo.geradoPorIa) {
      tokensEntrada += conteudo.tokensEntrada ?? 0;
      tokensSaida += conteudo.tokensSaida ?? 0;
    }

    const questoesOrigem = grupo.attempts
      .map((a) => a.questions?.numero_no_caderno)
      .filter(Boolean)
      .join(", ");

    itens.push({
      numeroNoCaderno: questoesOrigem || questaoRep.numero_no_caderno,
      disciplina: grupo.disciplina,
      assunto: grupo.assunto,
      enunciadoResumo: questaoRep.enunciado.length > 260 ? questaoRep.enunciado.slice(0, 260) + "…" : questaoRep.enunciado,
      alternativaEscolhidaTexto: alternativaEscolhida ? `${alternativaEscolhida.letra}) ${alternativaEscolhida.texto}` : null,
      alternativaCorretaTexto: alternativaCorreta ? `${alternativaCorreta.letra}) ${alternativaCorreta.texto}` : null,
      categoria: (representante.categoria_resultado_atual ?? representante.categoria_resultado)!,
      causaProvavel: representante.causa_provavel_sugerida,
      explicacao: conteudo.explicacao,
      resumoTeorico: conteudo.resumoTeorico,
      perguntaRecuperacao: conteudo.perguntaRecuperacao,
      respostaRecuperacao: conteudo.respostaRecuperacao,
      fontes: (fontesLinks ?? []).map((f) => {
        const fonte = f.fontes as unknown as {
          titulo: string;
          instituicao: string | null;
          data_ultima_consulta: string | null;
          status_verificacao: string;
        };
        return {
          titulo: fonte.titulo,
          instituicao: fonte.instituicao,
          dataConsulta: fonte.data_ultima_consulta,
          statusVerificacao: fonte.status_verificacao === "verificada" ? "verificada" : "atualização não verificada",
        };
      }),
    });
  }

  return { itens, assuntosPrioritarios, tokensEntrada, tokensSaida };
}
