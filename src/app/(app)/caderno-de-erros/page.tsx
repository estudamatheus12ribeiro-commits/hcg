import Link from "next/link";
import { getCurrentProfile } from "@/lib/data/profile";
import { createClient } from "@/lib/supabase/server";
import { ROTULOS_CATEGORIA, ROTULOS_CAUSA } from "@/lib/domain/classification";
import { agruparPor } from "@/lib/domain/stats";

const CATEGORIAS_ERRO_DUVIDA = ["erro_duvida", "erro_confianca", "acerto_chute", "acerto_duvida", "sem_resposta"];

export default async function CadernoDeErrosPage() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();

  const { data: attempts } = await supabase
    .from("attempts")
    .select(
      "id, categoria_resultado_atual, categoria_resultado, causa_provavel_final, causa_provavel_sugerida, respondido_em, block_id, questions(disciplina, assunto, enunciado, numero_no_caderno)",
    )
    .eq("profile_id", profile.id)
    .order("respondido_em", { ascending: false })
    .limit(500);

  const relevantes = (attempts ?? []).filter((a) => {
    const cat = a.categoria_resultado_atual ?? a.categoria_resultado;
    return cat && CATEGORIAS_ERRO_DUVIDA.includes(cat);
  });

  const porAssunto = agruparPor(
    relevantes,
    (a) => (a.questions as unknown as { disciplina: string | null; assunto: string | null } | null)?.assunto ??
      (a.questions as unknown as { disciplina: string | null } | null)?.disciplina ?? null,
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Caderno de erros e dúvidas</h1>
        <p className="text-sm text-foreground-muted">
          Reúne erros, dúvidas e acertos por chute de todos os blocos. Acerto por chute não é tratado como domínio
          comprovado.
        </p>
      </div>

      {Object.keys(porAssunto).length === 0 ? (
        <p className="text-sm text-foreground-muted">Nenhum erro ou dúvida registrado ainda — ótimo sinal.</p>
      ) : (
        Object.entries(porAssunto).map(([assunto, itens]) => (
          <div key={assunto} className="rounded-lg border border-border bg-surface p-4">
            <h2 className="mb-2 text-sm font-semibold">
              {assunto} <span className="font-normal text-foreground-muted">({itens.length})</span>
            </h2>
            <ul className="space-y-2">
              {itens.slice(0, 10).map((item) => {
                const q = item.questions as unknown as { enunciado: string; numero_no_caderno: string | null } | null;
                const categoria = item.categoria_resultado_atual ?? item.categoria_resultado!;
                const causa = item.causa_provavel_final ?? item.causa_provavel_sugerida;
                return (
                  <li key={item.id} className="border-t border-border pt-2 text-sm first:border-t-0 first:pt-0">
                    <p className="text-foreground-muted">
                      {ROTULOS_CATEGORIA[categoria]}
                      {causa ? ` · ${ROTULOS_CAUSA[causa]}` : ""} ·{" "}
                      <Link href={`/bloco/${item.block_id}/resultado`} className="text-brand underline">
                        ver diagnóstico do bloco
                      </Link>
                    </p>
                    <p className="line-clamp-2">{q?.enunciado}</p>
                  </li>
                );
              })}
            </ul>
          </div>
        ))
      )}
    </div>
  );
}
