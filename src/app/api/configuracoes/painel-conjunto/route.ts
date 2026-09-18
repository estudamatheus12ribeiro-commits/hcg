import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  const { optIn } = await req.json();
  const { error } = await supabase
    .from("shared_dashboard_consent")
    .upsert({ profile_id: user.id, opt_in: Boolean(optIn), atualizado_em: new Date().toISOString() });

  if (error) return NextResponse.json({ erro: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
