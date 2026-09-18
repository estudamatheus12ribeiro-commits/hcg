import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Tables, Enums } from "@/lib/supabase/types";
import { calcularMetrica, agruparPor } from "@/lib/domain/stats";

export async function AreaHome({
  profile,
  area,
  titulo,
}: {
  profile: Tables<"profiles">;
  area: Enums<"area_estudo">;
  titulo: string;
}) {
  if (profile.area !== area) {
    return (
      <div className="rounded-xl border border-border bg-surface p-6 text-center">
        <p className="text-sm text-foreground-muted">
          Esta área pertence a outro usuário. Você está logado como {profile.nome_exibicao}.
        </p>
      </div>
    );
  }

  const supabase = await createClient();

  const { data: exams } = await supabase
    .from("exams")
    .select("id, titulo, banca, instituicao, ano")
    .eq("area", area)
    .order("criado_em", { ascending: false })
    .limit(8);

  const { count: totalQuestoes } = await supabase
    .from("questions")
    .select("id", { count: "exact", head: true })
    .eq("area", area)
    .eq("status", "confirmada");

  const { data: attempts } = await supabase
    .from("attempts")
    .select("categoria_resultado_atual, categoria_resultado, questions(disciplina)")
    .eq("profile_id", profile.id);

  const porDisciplina = agruparPor(
    attempts ?? [],
    (a) => (a.questions as unknown as { disciplina: string | null } | null)?.disciplina ?? null,
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{titulo}</h1>
        <Link href="/bloco/novo" className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white">
          Iniciar bloco
        </Link>
      </div>

      <p className="text-sm text-foreground-muted">{totalQuestoes ?? 0} questões confirmadas disponíveis nesta área.</p>

      <div>
        <h2 className="mb-2 text-sm font-semibold">Desempenho por disciplina</h2>
        {Object.keys(porDisciplina).length === 0 ? (
          <p className="text-sm text-foreground-muted">Ainda sem respostas registradas.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {Object.entries(porDisciplina).map(([disciplina, itens]) => {
              const m = calcularMetrica(itens);
              return (
                <div key={disciplina} className="rounded-lg border border-border bg-surface p-3">
                  <p className="text-sm font-medium">{disciplina}</p>
                  {m.amostraInsuficiente ? (
                    <p className="text-xs text-warning">Amostra insuficiente ({m.total} válidas)</p>
                  ) : (
                    <p className="text-sm text-foreground-muted">
                      {m.percentual}% ({m.acertos}/{m.total})
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold">Provas / editais recentes</h2>
        {(exams ?? []).length === 0 ? (
          <p className="text-sm text-foreground-muted">
            Nenhuma prova importada ainda.{" "}
            <Link href="/provas/importar" className="text-brand underline">
              Importar a primeira
            </Link>
            .
          </p>
        ) : (
          <ul className="space-y-1 text-sm">
            {(exams ?? []).map((e) => (
              <li key={e.id}>
                <Link href={`/provas/${e.id}`} className="text-brand underline">
                  {e.titulo}
                </Link>{" "}
                <span className="text-foreground-muted">
                  {e.banca ? `— ${e.banca}` : ""} {e.ano ?? ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
