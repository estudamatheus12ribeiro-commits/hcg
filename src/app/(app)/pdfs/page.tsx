import { getCurrentProfile } from "@/lib/data/profile";
import { createClient } from "@/lib/supabase/server";
import { GerarConsolidadoButton } from "./GerarConsolidadoButton";

const ROTULO_TIPO: Record<string, string> = {
  bloco: "Bloco de 10 questões",
  semanal: "Consolidado semanal",
  assunto: "Por assunto",
  prova: "Por prova",
  consolidado: "Consolidado (30 dias)",
};

export default async function PdfsPage() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();

  const { data: pdfs } = await supabase
    .from("pdfs")
    .select("*")
    .eq("profile_id", profile.id)
    .order("gerado_em", { ascending: false });

  const comUrl = await Promise.all(
    (pdfs ?? []).map(async (pdf) => {
      const { data } = await supabase.storage.from("generated").createSignedUrl(pdf.storage_path, 60 * 60);
      return { ...pdf, url: data?.signedUrl ?? null };
    }),
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Biblioteca de PDFs</h1>
        <div className="flex gap-2">
          <GerarConsolidadoButton dias={7} />
          <GerarConsolidadoButton dias={30} />
        </div>
      </div>

      {comUrl.length === 0 ? (
        <p className="text-sm text-foreground-muted">
          Nenhum PDF gerado ainda. Complete um bloco de 10 questões para gerar o primeiro caderno de revisão.
        </p>
      ) : (
        <ul className="space-y-2">
          {comUrl.map((pdf) => (
            <li key={pdf.id} className="flex items-center justify-between rounded-lg border border-border bg-surface p-3">
              <div>
                <p className="text-sm font-medium">{pdf.titulo}</p>
                <p className="text-xs text-foreground-muted">
                  {ROTULO_TIPO[pdf.tipo]} · v{pdf.versao} · {new Date(pdf.gerado_em).toLocaleString("pt-BR")}
                  {pdf.substitui_pdf_id ? " · substitui versão anterior (histórico preservado)" : ""}
                </p>
              </div>
              {pdf.url ? (
                <a href={pdf.url} target="_blank" rel="noreferrer" className="text-sm text-brand underline">
                  Abrir
                </a>
              ) : (
                <span className="text-xs text-danger">Indisponível</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
