import { notFound } from "next/navigation";
import { getCurrentProfile } from "@/lib/data/profile";
import { createClient } from "@/lib/supabase/server";
import { BlocoRunner } from "./BlocoRunner";

export default async function BlocoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await getCurrentProfile();
  const supabase = await createClient();

  const { data: bloco } = await supabase.from("study_blocks").select("*").eq("id", id).single();
  if (!bloco) notFound();

  if (bloco.status === "concluido") {
    const { redirect } = await import("next/navigation");
    redirect(`/bloco/${id}/resultado`);
  }

  const { data: blockQuestions } = await supabase
    .from("block_questions")
    .select("ordem, questions(id, numero_no_caderno, disciplina, assunto, enunciado, tem_imagem)")
    .eq("block_id", id)
    .order("ordem");

  const questionIds = (blockQuestions ?? []).map((bq) => (bq.questions as unknown as { id: string }).id);

  const { data: alternatives } = await supabase
    .from("alternatives")
    .select("*")
    .in("question_id", questionIds.length > 0 ? questionIds : ["00000000-0000-0000-0000-000000000000"])
    .order("ordem");

  const { data: attempts } = await supabase
    .from("attempts")
    .select("question_id")
    .eq("block_id", id);

  const perguntas = (blockQuestions ?? []).map((bq) => {
    const q = bq.questions as unknown as {
      id: string;
      numero_no_caderno: string | null;
      disciplina: string | null;
      assunto: string | null;
      enunciado: string;
      tem_imagem: boolean;
    };
    return {
      id: q.id,
      ordem: bq.ordem,
      numero: q.numero_no_caderno,
      disciplina: q.disciplina,
      assunto: q.assunto,
      enunciado: q.enunciado,
      temImagem: q.tem_imagem,
      alternativas: (alternatives ?? [])
        .filter((a) => a.question_id === q.id)
        .map((a) => ({ id: a.id, letra: a.letra, texto: a.texto })),
    };
  });

  return (
    <BlocoRunner
      blockId={id}
      modo={bloco.modo}
      perguntas={perguntas}
      respondidasIds={(attempts ?? []).map((a) => a.question_id)}
    />
  );
}
