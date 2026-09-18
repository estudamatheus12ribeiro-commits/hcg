import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request, { params }: { params: Promise<{ fileId: string }> }) {
  const { fileId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  const body = await req.json();
  const questoes: Array<{
    id: string;
    descartar?: boolean;
    enunciado?: string;
    disciplina?: string;
    assunto?: string;
    subassunto?: string;
    tipoRaciocinio?: string;
    dificuldade?: string;
    alternativas?: { letra: string; texto: string }[];
  }> = body.questoes ?? [];

  for (const q of questoes) {
    if (q.descartar) {
      await supabase.from("questions").delete().eq("id", q.id);
      continue;
    }

    await supabase
      .from("questions")
      .update({
        enunciado: q.enunciado,
        disciplina: q.disciplina || null,
        assunto: q.assunto || null,
        subassunto: q.subassunto || null,
        tipo_raciocinio: q.tipoRaciocinio || null,
        dificuldade: (q.dificuldade as "facil" | "media" | "dificil" | "nao_estimada") || "nao_estimada",
        status: "confirmada",
        motivo_revisao: null,
      })
      .eq("id", q.id);

    if (q.alternativas) {
      await supabase.from("alternatives").delete().eq("question_id", q.id);
      await supabase.from("alternatives").insert(
        q.alternativas.map((a, idx) => ({ question_id: q.id, letra: a.letra, texto: a.texto, ordem: idx })),
      );
    }
  }

  const { count: pendentes } = await supabase
    .from("questions")
    .select("id", { count: "exact", head: true })
    .eq("exam_file_id", fileId)
    .eq("status", "revisao_pendente");

  if (!pendentes) {
    await supabase.from("exam_files").update({ status: "confirmado" }).eq("id", fileId);
  }

  return NextResponse.json({ ok: true, pendentes: pendentes ?? 0 });
}
