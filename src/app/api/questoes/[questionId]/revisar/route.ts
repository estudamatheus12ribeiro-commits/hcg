import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request, { params }: { params: Promise<{ questionId: string }> }) {
  const { questionId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  const body = await req.json();
  const acao = body.acao as "confirmar" | "descartar";

  if (acao === "descartar") {
    await supabase.from("questions").delete().eq("id", questionId);
    return NextResponse.json({ ok: true });
  }

  await supabase
    .from("questions")
    .update({ status: "confirmada", motivo_revisao: null })
    .eq("id", questionId);

  return NextResponse.json({ ok: true });
}
