import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  const { limiteUsdMensal } = await req.json();
  const { error } = await supabase.from("settings").upsert({
    profile_id: user.id,
    chave: "limite_ia_usd_mensal",
    valor: Number(limiteUsdMensal) || 0,
    atualizado_em: new Date().toISOString(),
  });

  if (error) return NextResponse.json({ erro: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
