import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { aplicarNovaVersaoGabarito } from "@/lib/data/answerKeys";

export async function POST(req: Request, { params }: { params: Promise<{ questionId: string }> }) {
  const { questionId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  const body = await req.json();
  const { status, respostaLetra, justificativa, anulada } = body as {
    status: "extraoficial" | "oficial_preliminar" | "oficial_definitivo";
    respostaLetra: string | null;
    justificativa: string | null;
    anulada: boolean;
  };

  try {
    const resultado = await aplicarNovaVersaoGabarito(supabase, questionId, {
      status,
      respostaLetra: anulada ? null : respostaLetra,
      justificativa,
      anulada: Boolean(anulada),
    });
    return NextResponse.json(resultado);
  } catch (e) {
    return NextResponse.json({ erro: e instanceof Error ? e.message : "Erro ao aplicar gabarito." }, { status: 500 });
  }
}
