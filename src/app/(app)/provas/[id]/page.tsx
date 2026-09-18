import { notFound } from "next/navigation";
import { getCurrentProfile } from "@/lib/data/profile";
import { createClient } from "@/lib/supabase/server";
import { RevisaoArquivo } from "./RevisaoArquivo";
import type { Tables } from "@/lib/supabase/types";

async function ArquivoComRascunhos({ arquivo }: { arquivo: Tables<"exam_files"> }) {
  const supabase = await createClient();
  let questoesRascunho: Array<{
    id: string;
    enunciado: string;
    numero_no_caderno: string | null;
    disciplina: string | null;
    assunto: string | null;
    subassunto: string | null;
    motivo_revisao: string | null;
    alternativas: { letra: string; texto: string }[];
  }> = [];

  if (arquivo.tipo === "prova" && arquivo.status === "revisao_pendente") {
    const { data: rascunhos } = await supabase
      .from("questions")
      .select("*, alternatives(letra, texto, ordem)")
      .eq("exam_file_id", arquivo.id)
      .eq("status", "revisao_pendente")
      .order("numero_no_caderno");
    questoesRascunho = (rascunhos ?? []).map((r) => ({
      id: r.id,
      enunciado: r.enunciado,
      numero_no_caderno: r.numero_no_caderno,
      disciplina: r.disciplina,
      assunto: r.assunto,
      subassunto: r.subassunto,
      motivo_revisao: r.motivo_revisao,
      alternativas: ((r.alternatives ?? []) as { letra: string; texto: string; ordem: number }[])
        .sort((a, b) => a.ordem - b.ordem)
        .map((a) => ({ letra: a.letra, texto: a.texto })),
    }));
  }

  return <RevisaoArquivo arquivo={arquivo} questoesRascunho={questoesRascunho} />;
}

export default async function ProvaDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await getCurrentProfile();
  const supabase = await createClient();

  const { data: exam } = await supabase.from("exams").select("*").eq("id", id).single();
  if (!exam) notFound();

  const { data: arquivos } = await supabase
    .from("exam_files")
    .select("*")
    .eq("exam_id", id)
    .order("criado_em", { ascending: false });

  const { data: flags } = await supabase
    .from("exam_extraction_flags")
    .select("*, exam_files!inner(exam_id)")
    .eq("exam_files.exam_id", id)
    .eq("resolvido", false);

  const { data: questoesConfirmadas, count: totalConfirmadas } = await supabase
    .from("questions")
    .select("id", { count: "exact", head: true })
    .eq("exam_id", id)
    .eq("status", "confirmada");
  void questoesConfirmadas;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">{exam.titulo}</h1>
        <p className="text-sm text-foreground-muted">
          {exam.banca ?? "Banca não informada"} {exam.instituicao ? `· ${exam.instituicao}` : ""} {exam.ano ?? ""}
        </p>
        <p className="mt-1 text-sm text-foreground-muted">{totalConfirmadas ?? 0} questões confirmadas nesta prova.</p>
      </div>

      {(flags ?? []).length > 0 && (
        <div className="rounded-lg border border-warning bg-warning-soft p-4 text-sm text-warning">
          <p className="mb-1 font-medium">Pontos sinalizados na extração:</p>
          <ul className="list-disc pl-5">
            {(flags ?? []).map((f) => (
              <li key={f.id}>
                {f.pagina ? `Pág. ${f.pagina}: ` : ""}
                {f.descricao}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-6">
        {(arquivos ?? []).map((arquivo) => (
          <ArquivoComRascunhos key={arquivo.id} arquivo={arquivo} />
        ))}
      </div>
    </div>
  );
}
