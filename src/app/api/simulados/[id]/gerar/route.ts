import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function embaralhar<T>(arr: T[]): T[] {
  const copia = [...arr];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (!profile) return NextResponse.json({ erro: "Perfil não encontrado." }, { status: 404 });

  const { data: simulado } = await supabase.from("simulados").select("*").eq("id", id).single();
  if (!simulado) return NextResponse.json({ erro: "Simulado não encontrado." }, { status: 404 });

  const TOTAL = 10;
  const idsSelecionados: string[] = [];
  let criterioUsado = simulado.criterio_distribuicao;

  if (simulado.edital_exam_id) {
    const { data: baseQuestoes } = await supabase
      .from("questions")
      .select("id, disciplina")
      .eq("exam_id", simulado.edital_exam_id)
      .eq("status", "confirmada");

    if (baseQuestoes && baseQuestoes.length >= 5) {
      const contagem = new Map<string, number>();
      for (const q of baseQuestoes) {
        const d = q.disciplina || "(sem disciplina)";
        contagem.set(d, (contagem.get(d) || 0) + 1);
      }
      const total = baseQuestoes.length;
      const distribuicao = Array.from(contagem.entries()).map(([disciplina, n]) => ({
        disciplina,
        quantidade: Math.round((n / total) * TOTAL),
      }));

      for (const d of distribuicao) {
        if (idsSelecionados.length >= TOTAL || d.quantidade === 0) continue;
        const { data: candidatas } = await supabase
          .from("questions")
          .select("id")
          .eq("area", profile.area)
          .eq("status", "confirmada")
          .eq("disciplina", d.disciplina)
          .limit(100);
        const escolhidas = embaralhar(candidatas ?? []).slice(0, d.quantidade);
        idsSelecionados.push(...escolhidas.map((c) => c.id));
      }
      criterioUsado = "edital";
    }
  }

  if (idsSelecionados.length < TOTAL) {
    const { data: candidatasGerais } = await supabase
      .from("questions")
      .select("id")
      .eq("area", profile.area)
      .eq("status", "confirmada")
      .limit(500);
    const restantes = embaralhar((candidatasGerais ?? []).filter((c) => !idsSelecionados.includes(c.id)));
    idsSelecionados.push(...restantes.slice(0, TOTAL - idsSelecionados.length).map((c) => c.id));
    if (criterioUsado !== "edital") criterioUsado = "amostra_importada";
  }

  if (idsSelecionados.length === 0) {
    return NextResponse.json({ erro: "Nenhuma questão confirmada disponível para montar o simulado." }, { status: 422 });
  }

  const { data: bloco, error } = await supabase
    .from("study_blocks")
    .insert({
      profile_id: profile.id,
      area: profile.area,
      modo: "simulado",
      filtros: { simuladoId: id, criterio: criterioUsado },
    })
    .select()
    .single();
  if (error || !bloco) return NextResponse.json({ erro: error?.message ?? "Falha ao criar bloco." }, { status: 500 });

  await supabase.from("block_questions").insert(
    idsSelecionados.slice(0, TOTAL).map((qid, idx) => ({ block_id: bloco.id, question_id: qid, ordem: idx + 1 })),
  );

  await supabase
    .from("simulados")
    .update({ status: "em_andamento", block_id: bloco.id, criterio_distribuicao: criterioUsado })
    .eq("id", id);

  return NextResponse.json({ blocoId: bloco.id, totalQuestoes: Math.min(idsSelecionados.length, TOTAL), criterioUsado });
}
