import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { aplicarNovaVersaoGabarito } from "@/lib/data/answerKeys";

export async function POST(req: Request, { params }: { params: Promise<{ fileId: string }> }) {
  const { fileId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  const { data: arquivo } = await supabase.from("exam_files").select("*").eq("id", fileId).single();
  if (!arquivo) return NextResponse.json({ erro: "Arquivo não encontrado." }, { status: 404 });

  const body = await req.json();
  const status = body.status as "extraoficial" | "oficial_preliminar" | "oficial_definitivo";
  const itens: Array<{ numeroNoCaderno: string; respostaLetra: string | null; anulada: boolean }> = body.itens ?? [];

  const aplicados: string[] = [];
  const naoAplicados: { numeroNoCaderno: string; motivo: string }[] = [];

  for (const item of itens) {
    const { data: candidatas } = await supabase
      .from("questions")
      .select("id")
      .eq("exam_id", arquivo.exam_id)
      .eq("numero_no_caderno", item.numeroNoCaderno)
      .eq("status", "confirmada");

    if (!candidatas || candidatas.length === 0) {
      naoAplicados.push({ numeroNoCaderno: item.numeroNoCaderno, motivo: "Nenhuma questão confirmada com esse número nesta prova." });
      continue;
    }
    if (candidatas.length > 1) {
      naoAplicados.push({
        numeroNoCaderno: item.numeroNoCaderno,
        motivo: `${candidatas.length} questões confirmadas com o mesmo número — associação ambígua, aplique manualmente.`,
      });
      continue;
    }

    await aplicarNovaVersaoGabarito(supabase, candidatas[0].id, {
      status,
      respostaLetra: item.anulada ? null : item.respostaLetra,
      justificativa: null,
      anulada: item.anulada,
      fonteArquivoId: fileId,
    });
    aplicados.push(item.numeroNoCaderno);
  }

  await supabase.from("exam_files").update({ status: "confirmado" }).eq("id", fileId);

  return NextResponse.json({ aplicados, naoAplicados });
}
