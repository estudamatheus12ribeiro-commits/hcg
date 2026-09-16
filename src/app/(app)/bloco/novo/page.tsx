import { getCurrentProfile } from "@/lib/data/profile";
import { createClient } from "@/lib/supabase/server";
import { NovoBlocoForm } from "./NovoBlocoForm";

export default async function NovoBlocoPage() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();

  const { data: exams } = await supabase
    .from("exams")
    .select("id, titulo, banca")
    .eq("area", profile.area)
    .order("criado_em", { ascending: false });

  const { data: questoes } = await supabase
    .from("questions")
    .select("disciplina, assunto")
    .eq("area", profile.area)
    .eq("status", "confirmada");

  const disciplinas = Array.from(new Set((questoes ?? []).map((q) => q.disciplina).filter(Boolean))) as string[];
  const assuntosPorDisciplina = new Map<string, Set<string>>();
  for (const q of questoes ?? []) {
    if (!q.disciplina || !q.assunto) continue;
    if (!assuntosPorDisciplina.has(q.disciplina)) assuntosPorDisciplina.set(q.disciplina, new Set());
    assuntosPorDisciplina.get(q.disciplina)!.add(q.assunto);
  }
  const assuntosMap: Record<string, string[]> = {};
  for (const [d, s] of assuntosPorDisciplina) assuntosMap[d] = Array.from(s);

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-1 text-xl font-semibold">Novo bloco de 10 questões</h1>
      <p className="mb-6 text-sm text-foreground-muted">
        Escolha prova/banca e filtros. Total de questões confirmadas disponíveis: {questoes?.length ?? 0}.
      </p>
      <NovoBlocoForm exams={exams ?? []} disciplinas={disciplinas} assuntosMap={assuntosMap} />
    </div>
  );
}
