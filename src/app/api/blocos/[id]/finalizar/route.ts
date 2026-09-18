import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { gerarPdfCadernoDeErros } from "@/lib/pdf/cadernoDeErros";
import { proximoIntervalo, explicarPriorizacao, INTERVALOS_PADRAO_DIAS } from "@/lib/domain/spacedRepetition";
import { agruparAttemptsParaRevisao, construirItensCaderno } from "@/lib/domain/buildCadernoItens";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: blockId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  const { data: bloco } = await supabase.from("study_blocks").select("*").eq("id", blockId).single();
  if (!bloco) return NextResponse.json({ erro: "Bloco não encontrado." }, { status: 404 });

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (!profile) return NextResponse.json({ erro: "Perfil não encontrado." }, { status: 404 });

  const { data: configIntervalos } = await supabase
    .from("settings")
    .select("valor")
    .eq("profile_id", profile.id)
    .eq("chave", "intervalos_revisao")
    .maybeSingle();
  const intervalosConfigurados = Array.isArray(configIntervalos?.valor)
    ? (configIntervalos!.valor as number[])
    : undefined;

  let exam: { titulo: string; banca: string | null } | null = null;
  if (bloco.exam_id) {
    const { data } = await supabase.from("exams").select("titulo, banca").eq("id", bloco.exam_id).single();
    exam = data;
  }

  const { data: attempts } = await supabase
    .from("attempts")
    .select("*, questions(id, disciplina, assunto, enunciado, numero_no_caderno)")
    .eq("block_id", blockId);

  if (!attempts || attempts.length === 0) {
    return NextResponse.json({ erro: "Nenhuma resposta registrada neste bloco ainda." }, { status: 422 });
  }

  if (bloco.status !== "concluido") {
    await supabase
      .from("study_blocks")
      .update({ status: "concluido", finalizado_em: new Date().toISOString() })
      .eq("id", blockId);
  }

  // ===== Totais =====
  const totais = {
    acertoSeguro: 0,
    acertoDuvida: 0,
    acertoChute: 0,
    erroDuvida: 0,
    erroConfianca: 0,
    semResposta: 0,
  };
  const semGabaritoAinda = attempts.filter((a) => a.categoria_resultado === null).length;
  for (const a of attempts) {
    switch (a.categoria_resultado) {
      case "acerto_seguro": totais.acertoSeguro++; break;
      case "acerto_duvida": totais.acertoDuvida++; break;
      case "acerto_chute": totais.acertoChute++; break;
      case "erro_duvida": totais.erroDuvida++; break;
      case "erro_confianca": totais.erroConfianca++; break;
      case "sem_resposta": totais.semResposta++; break;
    }
  }

  // ===== Agrupar itens que precisam de revisão por disciplina/assunto =====
  const attemptsTyped = attempts.map((a) => ({
    ...a,
    questions: a.questions as unknown as {
      id: string;
      disciplina: string | null;
      assunto: string | null;
      enunciado: string;
      numero_no_caderno: string | null;
    } | null,
  }));
  const grupos = agruparAttemptsParaRevisao(attemptsTyped);
  const {
    itens: itensPdf,
    assuntosPrioritarios,
    tokensEntrada: tokensEntradaTotal,
    tokensSaida: tokensSaidaTotal,
  } = await construirItensCaderno(supabase, grupos, profile.area);

  if (tokensEntradaTotal + tokensSaidaTotal > 0) {
    const { estimarCustoUsd } = await import("@/lib/ai/client");
    await supabase.from("ai_usage_log").insert({
      profile_id: profile.id,
      funcionalidade: "caderno_de_erros",
      modelo: "claude-sonnet-5",
      tokens_entrada: tokensEntradaTotal,
      tokens_saida: tokensSaidaTotal,
      custo_estimado_usd: estimarCustoUsd(tokensEntradaTotal, tokensSaidaTotal),
    });
  }

  // ===== Diagnóstico =====
  const { data: diagnostico } = await supabase
    .from("diagnostics")
    .insert({
      block_id: blockId,
      profile_id: profile.id,
      resumo: { totais, semGabaritoAinda, totalQuestoes: attempts.length },
      assuntos_prioritarios: assuntosPrioritarios,
    })
    .select()
    .single();

  // ===== Fila de revisão espaçada =====
  const revisoesGeradas: { assunto: string; dataPrevista: string; motivo: string }[] = [];
  for (const grupo of grupos.values()) {
    // busca entrada pendente OU a mais recente já concluída para este assunto, para dar
    // continuidade à progressão de intervalos (em vez de sempre reiniciar do zero)
    let consultaEntrada = supabase.from("review_queue").select("*").eq("profile_id", profile.id);
    consultaEntrada = grupo.disciplina
      ? consultaEntrada.eq("disciplina", grupo.disciplina)
      : consultaEntrada.is("disciplina", null);
    consultaEntrada = grupo.assunto ? consultaEntrada.eq("assunto", grupo.assunto) : consultaEntrada.is("assunto", null);
    const { data: entradaExistente } = await consultaEntrada
      .order("criado_em", { ascending: false })
      .limit(1)
      .maybeSingle();

    const piorAttempt = grupo.attempts.sort((a, b) => {
      const peso: Record<string, number> = {
        erro_confianca: 0,
        erro_duvida: 1,
        sem_resposta: 2,
        acerto_chute: 3,
        acerto_duvida: 4,
      };
      return (peso[a.categoria_resultado ?? ""] ?? 9) - (peso[b.categoria_resultado ?? ""] ?? 9);
    })[0];

    const { intervaloDias, sequenciaAcertos } = proximoIntervalo({
      intervaloAtualDias: entradaExistente?.intervalo_dias ?? (intervalosConfigurados ?? INTERVALOS_PADRAO_DIAS)[0],
      categoria: piorAttempt.categoria_resultado!,
      sequenciaAcertos: entradaExistente?.sequencia_acertos ?? 0,
      intervalos: intervalosConfigurados,
    });
    const dataPrevista = new Date();
    dataPrevista.setDate(dataPrevista.getDate() + intervaloDias);

    const motivo = explicarPriorizacao({
      categoria: piorAttempt.categoria_resultado!,
      disciplina: grupo.disciplina,
      assunto: grupo.assunto,
    });

    if (entradaExistente && entradaExistente.status === "pendente") {
      // já estava pendente (ainda não foi revisado) — mantém na fila, sem duplicar
      continue;
    }

    if (entradaExistente) {
      await supabase
        .from("review_queue")
        .update({
          origem_attempt_id: piorAttempt.id,
          origem_question_id: piorAttempt.question_id,
          motivo,
          intervalo_dias: intervaloDias,
          data_prevista: dataPrevista.toISOString().slice(0, 10),
          ultima_revisao_em: new Date().toISOString(),
          ultimo_resultado: piorAttempt.categoria_resultado,
          sequencia_acertos: sequenciaAcertos,
          status: "pendente",
        })
        .eq("id", entradaExistente.id);
    } else {
      await supabase.from("review_queue").insert({
        profile_id: profile.id,
        disciplina: grupo.disciplina,
        assunto: grupo.assunto,
        origem_attempt_id: piorAttempt.id,
        origem_question_id: piorAttempt.question_id,
        motivo,
        intervalo_dias: intervaloDias,
        data_prevista: dataPrevista.toISOString().slice(0, 10),
        status: "pendente",
      });
    }

    revisoesGeradas.push({
      assunto: grupo.assunto || grupo.disciplina || "Assunto não classificado",
      dataPrevista: dataPrevista.toLocaleDateString("pt-BR"),
      motivo,
    });
  }

  // ===== PDF =====
  const pdfBuffer = await gerarPdfCadernoDeErros({
    nomeUsuario: profile.nome_exibicao,
    area: profile.area,
    provaAlvo: exam?.titulo ?? null,
    bancaAlvo: exam?.banca ?? null,
    blocoId: blockId,
    geradoEm: new Date(),
    modo: bloco.modo,
    totais,
    assuntosPrioritarios,
    itens: itensPdf,
    proximasRevisoes: revisoesGeradas,
    versaoDocumento: 1,
  });

  const storagePath = `${profile.area}/${profile.id}/blocos/${blockId}-v1.pdf`;
  const { error: erroUpload } = await supabase.storage
    .from("generated")
    .upload(storagePath, pdfBuffer, { contentType: "application/pdf", upsert: true });

  let pdfId: string | null = null;
  if (!erroUpload) {
    const { data: pdfRow } = await supabase
      .from("pdfs")
      .insert({
        profile_id: profile.id,
        block_id: blockId,
        tipo: "bloco",
        titulo: `Caderno de revisão — ${exam?.titulo ?? "Banco de questões"} — ${new Date().toLocaleDateString("pt-BR")}`,
        storage_path: storagePath,
        versao: 1,
      })
      .select()
      .single();
    pdfId = pdfRow?.id ?? null;
  }

  return NextResponse.json({
    diagnosticoId: diagnostico?.id,
    totais,
    semGabaritoAinda,
    assuntosPrioritarios,
    revisoesGeradas,
    pdfId,
    erroUpload: erroUpload?.message ?? null,
  });
}
