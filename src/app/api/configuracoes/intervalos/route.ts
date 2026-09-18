import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  const { intervalos } = await req.json();
  if (!Array.isArray(intervalos) || intervalos.some((n) => typeof n !== "number" || n <= 0)) {
    return NextResponse.json({ erro: "Intervalos inválidos." }, { status: 422 });
  }

  const { error } = await supabase
    .from("settings")
    .upsert({ profile_id: user.id, chave: "intervalos_revisao", valor: intervalos, atualizado_em: new Date().toISOString() });

  if (error) return NextResponse.json({ erro: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
