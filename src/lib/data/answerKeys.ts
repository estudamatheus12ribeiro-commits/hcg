import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Enums } from "@/lib/supabase/types";
import { classificarResultado } from "@/lib/domain/classification";

type Cliente = SupabaseClient<Database>;

export async function aplicarNovaVersaoGabarito(
  supabase: Cliente,
  questionId: string,
  novo: {
    status: Enums<"status_gabarito">;
    respostaLetra: string | null;
    justificativa: string | null;
    anulada: boolean;
    fonteArquivoId?: string | null;
    fontePagina?: number | null;
  },
) {
  const { data: atual } = await supabase
    .from("answer_keys")
    .select("*")
    .eq("question_id", questionId)
    .eq("ativo", true)
    .order("versao", { ascending: false })
    .limit(1)
    .maybeSingle();

  const novaVersao = (atual?.versao ?? 0) + 1;
  const respostaAlterada = Boolean(
    atual && atual.resposta_letra && novo.respostaLetra && atual.resposta_letra !== novo.respostaLetra,
  );

  if (atual) {
    await supabase.from("answer_keys").update({ ativo: false }).eq("id", atual.id);
  }

  const { data: novoRegistro, error } = await supabase
    .from("answer_keys")
    .insert({
      question_id: questionId,
      versao: novaVersao,
      status: novo.status,
      resposta_letra: novo.respostaLetra,
      justificativa: novo.justificativa,
      anulada: novo.anulada,
      resposta_alterada: respostaAlterada,
      fonte_arquivo_id: novo.fonteArquivoId ?? null,
      fonte_pagina: novo.fontePagina ?? null,
      ativo: true,
    })
    .select()
    .single();

  if (error || !novoRegistro) throw new Error(error?.message ?? "Falha ao criar versão de gabarito.");

  if (novaVersao === 1) {
    // primeira versão: apenas classifica tentativas existentes (se houver), sem "recomputar" no sentido de mudança
    await recalcularTentativas(supabase, questionId, novoRegistro, novaVersao, atual?.versao ?? null);
    return { versao: novaVersao, impacto: [] as ImpactoItem[] };
  }

  const impacto = await recalcularTentativas(supabase, questionId, novoRegistro, novaVersao, atual?.versao ?? null);
  return { versao: novaVersao, impacto };
}

type ImpactoItem = {
  profile_id: string;
  attempt_id: string;
  categoria_antes: string | null;
  categoria_depois: string | null;
};

async function recalcularTentativas(
  supabase: Cliente,
  questionId: string,
  gabarito: { status: string; resposta_letra: string | null; anulada: boolean },
  versaoNova: number,
  versaoAnterior: number | null,
) {
  const { data: attempts } = await supabase
    .from("attempts")
    .select("id, profile_id, sem_resposta, confianca, categoria_resultado_atual, alternativa_escolhida_id")
    .eq("question_id", questionId);

  if (!attempts || attempts.length === 0) return [];

  const idsAlternativas = attempts.map((a) => a.alternativa_escolhida_id).filter(Boolean) as string[];
  const { data: alternativas } = idsAlternativas.length
    ? await supabase.from("alternatives").select("id, letra").in("id", idsAlternativas)
    : { data: [] as { id: string; letra: string }[] };
  const letraPorId = new Map((alternativas ?? []).map((a) => [a.id, a.letra]));

  const gabaritoValido = gabarito.status !== "ausente" && !gabarito.anulada && gabarito.resposta_letra;

  const impacto: ImpactoItem[] = [];
  for (const a of attempts) {
    const letraEscolhida = a.alternativa_escolhida_id ? letraPorId.get(a.alternativa_escolhida_id) : null;
    const correta = gabaritoValido ? !a.sem_resposta && letraEscolhida === gabarito.resposta_letra : null;
    const novaCategoria = classificarResultado({
      semResposta: a.sem_resposta,
      correta,
      confianca: a.confianca,
    });

    if (novaCategoria !== a.categoria_resultado_atual) {
      impacto.push({
        profile_id: a.profile_id,
        attempt_id: a.id,
        categoria_antes: a.categoria_resultado_atual,
        categoria_depois: novaCategoria,
      });
    }

    await supabase
      .from("attempts")
      .update({
        categoria_resultado_atual: novaCategoria,
        answer_key_versao_utilizada: versaoNova,
      })
      .eq("id", a.id);
  }

  if (impacto.length > 0 || versaoAnterior !== null) {
    await supabase.from("answer_key_recompute_log").insert({
      question_id: questionId,
      versao_anterior: versaoAnterior,
      versao_nova: versaoNova,
      impacto,
    });
  }

  return impacto;
}
