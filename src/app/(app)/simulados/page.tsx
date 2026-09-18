import Link from "next/link";
import { getCurrentProfile } from "@/lib/data/profile";
import { createClient } from "@/lib/supabase/server";
import { NovoSimuladoForm } from "./NovoSimuladoForm";
import { GerarSimuladoButton } from "./GerarSimuladoButton";

const ROTULO_CRITERIO: Record<string, string> = {
  edital: "distribuição do edital/prova importada",
  amostra_importada: "amostra geral importada",
  manual: "manual",
};

export default async function SimuladosPage() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();

  const { data: simulados } = await supabase
    .from("simulados")
    .select("*")
    .eq("profile_id", profile.id)
    .order("criado_em", { ascending: false });

  const { data: exams } = await supabase
    .from("exams")
    .select("id, titulo")
    .eq("area", profile.area)
    .order("criado_em", { ascending: false });

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Simulados</h1>
      <NovoSimuladoForm exams={exams ?? []} />

      <div className="space-y-2">
        {(simulados ?? []).length === 0 ? (
          <p className="text-sm text-foreground-muted">Nenhum simulado cadastrado ainda.</p>
        ) : (
          (simulados ?? []).map((s) => (
            <div key={s.id} className="flex items-center justify-between rounded-lg border border-border bg-surface p-4">
              <div>
                <p className="text-sm font-medium">{s.titulo}</p>
                <p className="text-xs text-foreground-muted">
                  {s.banca ?? "Banca não informada"} {s.data_prova ? `· prova em ${new Date(s.data_prova).toLocaleDateString("pt-BR")}` : ""}
                  {" · critério: "}
                  {ROTULO_CRITERIO[s.criterio_distribuicao ?? ""] ?? "manual"}
                </p>
                <p className="text-xs text-foreground-muted">Status: {s.status}</p>
              </div>
              {s.status === "planejado" && <GerarSimuladoButton simuladoId={s.id} />}
              {s.block_id && s.status !== "planejado" && (
                <Link href={`/bloco/${s.block_id}`} className="text-sm text-brand underline">
                  Abrir
                </Link>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
