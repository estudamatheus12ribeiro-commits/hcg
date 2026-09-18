import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (!profile) return NextResponse.json({ erro: "Perfil não encontrado." }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const {
    examId,
    disciplina,
    assunto,
    dificuldade,
    origem,
    modo = "estudo",
    quantidade = 10,
  }: {
    examId?: string;
    disciplina?: string;
    assunto?: string;
    dificuldade?: string;
    origem?: "importada" | "ia" | "mista";
    modo?: "estudo" | "simulado";
    quantidade?: number;
  } = body;

  let query = supabase
    .from("questions")
    .select("id")
    .eq("area", profile.area)
    .eq("status", "confirmada");

  if (examId) query = query.eq("exam_id", examId);
  if (disciplina) query = query.eq("disciplina", disciplina);
  if (assunto) query = query.eq("assunto", assunto);
  if (dificuldade) query = query.eq("dificuldade", dificuldade as "facil" | "media" | "dificil" | "nao_estimada");
  if (origem && origem !== "mista") query = query.eq("origem", origem);

  const { data: candidatas, error: erroQuestoes } = await query.limit(500);
  if (erroQuestoes) return NextResponse.json({ erro: erroQuestoes.message }, { status: 500 });

  if (!candidatas || candidatas.length === 0) {
    return NextResponse.json(
      {
        erro:
          "Nenhuma questão confirmada encontrada com esses filtros. Importe uma prova, gere questões por IA ou ajuste os filtros.",
      },
      { status: 422 },
    );
  }

  // embaralha e seleciona (Fisher-Yates)
  const embaralhadas = [...candidatas];
  for (let i = embaralhadas.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [embaralhadas[i], embaralhadas[j]] = [embaralhadas[j], embaralhadas[i]];
  }
  const selecionadas = embaralhadas.slice(0, quantidade);
  const amostraMenorQueSolicitada = selecionadas.length < quantidade;

  const { data: bloco, error: erroBloco } = await supabase
    .from("study_blocks")
    .insert({
      profile_id: profile.id,
      area: profile.area,
      exam_id: examId ?? null,
      modo,
      filtros: { examId, disciplina, assunto, dificuldade, origem },
    })
    .select()
    .single();

  if (erroBloco || !bloco) {
    return NextResponse.json({ erro: erroBloco?.message ?? "Falha ao criar bloco." }, { status: 500 });
  }

  const linhas = selecionadas.map((q, idx) => ({
    block_id: bloco.id,
    question_id: q.id,
    ordem: idx + 1,
  }));
  const { error: erroLinhas } = await supabase.from("block_questions").insert(linhas);
  if (erroLinhas) {
    return NextResponse.json({ erro: erroLinhas.message }, { status: 500 });
  }

  return NextResponse.json({
    blocoId: bloco.id,
    totalQuestoes: selecionadas.length,
    amostraMenorQueSolicitada,
  });
}
