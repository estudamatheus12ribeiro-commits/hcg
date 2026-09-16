import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentProfile } from "@/lib/data/profile";
import { createClient } from "@/lib/supabase/server";
import { ROTULOS_CATEGORIA } from "@/lib/domain/classification";

export default async function ResultadoBlocoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await getCurrentProfile();
  const supabase = await createClient();

  const { data: bloco } = await supabase.from("study_blocks").select("*").eq("id", id).single();
  if (!bloco) notFound();

  const { data: diagnostico } = await supabase
    .from("diagnostics")
    .select("*")
    .eq("block_id", id)
    .order("gerado_em", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: pdf } = await supabase
    .from("pdfs")
    .select("*")
    .eq("block_id", id)
    .order("versao", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: attempts } = await supabase
    .from("attempts")
    .select("categoria_resultado")
    .eq("block_id", id);

  const resumo = (diagnostico?.resumo ?? {}) as {
    totais?: Record<string, number>;
    semGabaritoAinda?: number;
    totalQuestoes?: number;
  };
  const assuntosPrioritarios = (diagnostico?.assuntos_prioritarios ?? []) as string[];

  const contagem: Record<string, number> = {};
  for (const a of attempts ?? []) {
    if (!a.categoria_resultado) continue;
    contagem[a.categoria_resultado] = (contagem[a.categoria_resultado] || 0) + 1;
  }
  const totalValido = Object.values(contagem).reduce((s, v) => s + v, 0);
  const acertos =
    (contagem["acerto_seguro"] || 0) + (contagem["acerto_duvida"] || 0) + (contagem["acerto_chute"] || 0);

  let pdfUrl: string | null = null;
  if (pdf) {
    const { data } = await supabase.storage.from("generated").createSignedUrl(pdf.storage_path, 60 * 60);
    pdfUrl = data?.signedUrl ?? null;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Diagnóstico do bloco</h1>
        <p className="text-sm text-foreground-muted">
          {acertos} acerto(s) de {totalValido} questão(ões) com gabarito confirmado
          {resumo.semGabaritoAinda ? ` · ${resumo.semGabaritoAinda} aguardando gabarito` : ""}.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {Object.entries(ROTULOS_CATEGORIA).map(([chave, rotulo]) => (
          <div key={chave} className="rounded-lg border border-border bg-surface p-3">
            <p className="text-2xl font-semibold">{contagem[chave] || 0}</p>
            <p className="text-xs text-foreground-muted">{rotulo}</p>
          </div>
        ))}
      </div>

      {assuntosPrioritarios.length > 0 && (
        <div className="rounded-lg border border-border bg-surface p-4">
          <h2 className="mb-2 text-sm font-semibold">Assuntos prioritários identificados</h2>
          <div className="flex flex-wrap gap-2">
            {assuntosPrioritarios.map((a) => (
              <span key={a} className="rounded-full bg-warning-soft px-3 py-1 text-xs text-warning">
                {a}
              </span>
            ))}
          </div>
          <p className="mt-2 text-xs text-foreground-muted">
            Acerto por chute não é tratado como domínio comprovado — por isso pode aparecer aqui mesmo com resposta certa.
          </p>
        </div>
      )}

      <div className="rounded-lg border border-border bg-surface p-4">
        <h2 className="mb-2 text-sm font-semibold">Caderno de revisão (PDF)</h2>
        {pdfUrl ? (
          <a
            href={pdfUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-block rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white"
          >
            Abrir PDF gerado
          </a>
        ) : (
          <p className="text-sm text-danger">
            O PDF não pôde ser gerado ou enviado ao armazenamento. Tente novamente pela Biblioteca de PDFs.
          </p>
        )}
      </div>

      <div className="flex gap-3">
        <Link href="/revisoes" className="text-sm text-brand underline">
          Ver fila de revisões
        </Link>
        <Link href="/bloco/novo" className="text-sm text-brand underline">
          Iniciar novo bloco
        </Link>
        <Link href="/desempenho" className="text-sm text-brand underline">
          Ver desempenho
        </Link>
      </div>
    </div>
  );
}
