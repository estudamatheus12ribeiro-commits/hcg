import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { iaDisponivel } from "@/lib/ai/client";
import { gerarQuestoesIneditas } from "@/lib/ai/generateQuestions";
import { analisarProvas, type QuestaoParaAnalise } from "@/lib/domain/examAnalysis";

export async function POST(req: Request) {
  if (!iaDisponivel()) {
    return NextResponse.json(
      { erro: "ANTHROPIC_API_KEY não configurada — geração de questões por IA está desativada neste ambiente." },
      { status: 503 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (!profile) return NextResponse.json({ erro: "Perfil não encontrado." }, { status: 404 });

  const body = await req.json();
  const { disciplina, assunto, banca, quantidade = 3 } = body as {
    disciplina: string;
    assunto: string;
    banca?: string;
    quantidade?: number;
  };
  if (!disciplina || !assunto) {
    return NextResponse.json({ erro: "Disciplina e assunto são obrigatórios." }, { status: 422 });
  }

  const { data: limiteConfig } = await supabase
    .from("settings")
    .select("valor")
    .eq("profile_id", profile.id)
    .eq("chave", "limite_ia_usd_mensal")
    .maybeSingle();
  const limiteUsd = typeof limiteConfig?.valor === "number" ? limiteConfig.valor : null;

  if (limiteUsd && limiteUsd > 0) {
    const inicioMes = new Date();
    inicioMes.setDate(1);
    inicioMes.setHours(0, 0, 0, 0);
    const { data: usoMes } = await supabase
      .from("ai_usage_log")
      .select("custo_estimado_usd")
      .eq("profile_id", profile.id)
      .gte("criado_em", inicioMes.toISOString());
    const gastoAtual = (usoMes ?? []).reduce((s, u) => s + Number(u.custo_estimado_usd ?? 0), 0);
    if (gastoAtual >= limiteUsd) {
      return NextResponse.json(
        { erro: `Limite mensal de IA (US$ ${limiteUsd.toFixed(2)}) já atingido (US$ ${gastoAtual.toFixed(4)} gastos). Ajuste o limite em Configurações.` },
        { status: 429 },
      );
    }
  }

  let query = supabase
    .from("questions")
    .select("enunciado, disciplina, assunto, tipo_raciocinio, tem_imagem, exam_id, exams(ano, banca)")
    .eq("area", profile.area)
    .eq("status", "confirmada")
    .eq("origem", "importada");
  if (disciplina) query = query.eq("disciplina", disciplina);
  if (assunto) query = query.eq("assunto", assunto);

  const { data: questoesBase } = await query.limit(200);

  const paraAnalise: QuestaoParaAnalise[] = (questoesBase ?? []).map((q) => {
    const exam = q.exams as unknown as { ano: number | null; banca: string | null } | null;
    return {
      enunciado: q.enunciado,
      disciplina: q.disciplina,
      assunto: q.assunto,
      tipo_raciocinio: q.tipo_raciocinio,
      tem_imagem: q.tem_imagem,
      numero_alternativas: 0,
      ano: exam?.ano ?? null,
      banca: exam?.banca ?? null,
    };
  });
  const provasUnicas = new Set((questoesBase ?? []).map((q) => q.exam_id).filter(Boolean));
  const perfil = paraAnalise.length > 0 ? analisarProvas(paraAnalise, provasUnicas.size) : null;

  try {
    const resultado = await gerarQuestoesIneditas({
      area: profile.area,
      banca: banca || perfil?.amostra.bancas[0] || null,
      disciplina,
      assunto,
      quantidade: Math.min(Math.max(1, quantidade), 10),
      perfil,
      exemplosEnunciados: paraAnalise.map((q) => q.enunciado),
    });

    const idsInseridos: string[] = [];
    for (const q of resultado.questoes) {
      const { data: questaoInserida } = await supabase
        .from("questions")
        .insert({
          area: profile.area,
          origem: "ia",
          disciplina: q.disciplina || disciplina,
          assunto: q.assunto || assunto,
          enunciado: q.enunciado,
          dificuldade: q.dificuldadeEstimada,
          status: "revisao_pendente",
          motivo_revisao: "Questão gerada por IA — revise antes de confirmar (fica fora da pontuação até então).",
          gerado_por_ia_prompt: resultado.promptResumo,
          gerado_por_ia_em: new Date().toISOString(),
          ia_modelo: resultado.modelo,
          criado_por: profile.id,
        })
        .select()
        .single();
      if (!questaoInserida) continue;

      await supabase.from("alternatives").insert(
        q.alternativas.map((a, idx) => ({ question_id: questaoInserida.id, letra: a.letra, texto: a.texto, ordem: idx })),
      );

      await supabase.from("answer_keys").insert({
        question_id: questaoInserida.id,
        versao: 1,
        status: "extraoficial",
        resposta_letra: q.respostaCorreta,
        justificativa: `${q.justificativa}\n\nExplicação por alternativa: ${Object.entries(q.explicacaoAlternativas)
          .map(([l, t]) => `${l}) ${t}`)
          .join(" ")}`,
        ativo: true,
      });

      idsInseridos.push(questaoInserida.id);
    }

    await supabase.from("ai_usage_log").insert({
      profile_id: profile.id,
      funcionalidade: "geracao_questoes",
      modelo: resultado.modelo,
      tokens_entrada: resultado.tokensEntrada,
      tokens_saida: resultado.tokensSaida,
      custo_estimado_usd: resultado.custoEstimadoUsd,
    });

    return NextResponse.json({
      geradas: idsInseridos.length,
      perfilUsado: perfil,
      custoEstimadoUsd: resultado.custoEstimadoUsd,
    });
  } catch (e) {
    return NextResponse.json({ erro: e instanceof Error ? e.message : "Falha ao gerar questões." }, { status: 500 });
  }
}
