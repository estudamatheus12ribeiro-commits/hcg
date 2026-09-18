import Link from "next/link";
import { getCurrentProfile } from "@/lib/data/profile";
import { createClient } from "@/lib/supabase/server";

export default async function ProvasPage() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();

  const { data: exams } = await supabase
    .from("exams")
    .select("id, titulo, banca, instituicao, ano, criado_em, exam_files(status)")
    .eq("area", profile.area)
    .order("criado_em", { ascending: false });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Provas e editais importados</h1>
        <Link href="/provas/importar" className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white">
          Importar prova
        </Link>
      </div>

      {(exams ?? []).length === 0 ? (
        <p className="text-sm text-foreground-muted">Nenhuma prova importada ainda.</p>
      ) : (
        <ul className="space-y-2">
          {(exams ?? []).map((e) => {
            const arquivos = (e.exam_files ?? []) as { status: string }[];
            const pendentes = arquivos.filter((a) => a.status === "revisao_pendente" || a.status === "pendente" || a.status === "processando").length;
            return (
              <li key={e.id} className="rounded-lg border border-border bg-surface p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Link href={`/provas/${e.id}`} className="font-medium text-brand underline">
                      {e.titulo}
                    </Link>
                    <p className="text-xs text-foreground-muted">
                      {e.banca ?? "Banca não informada"} {e.instituicao ? `· ${e.instituicao}` : ""} {e.ano ?? ""}
                    </p>
                  </div>
                  {pendentes > 0 && (
                    <span className="rounded-full bg-warning-soft px-2 py-1 text-xs text-warning">
                      {pendentes} arquivo(s) aguardando revisão
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
