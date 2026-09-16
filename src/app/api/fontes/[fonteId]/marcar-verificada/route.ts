import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(_req: Request, { params }: { params: Promise<{ fonteId: string }> }) {
  const { fonteId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  const { error } = await supabase
    .from("fontes")
    .update({ status_verificacao: "verificada", data_ultima_consulta: new Date().toISOString() })
    .eq("id", fonteId);

  if (error) return NextResponse.json({ erro: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
