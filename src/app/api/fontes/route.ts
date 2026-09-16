import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (!profile) return NextResponse.json({ erro: "Perfil não encontrado." }, { status: 404 });

  const body = await req.json();
  const { titulo, instituicao, url, dataPublicacao, verificacaoAutomatica, intervaloDias } = body;
  if (!titulo) return NextResponse.json({ erro: "Título é obrigatório." }, { status: 422 });

  const { data: fonte, error } = await supabase
    .from("fontes")
    .insert({
      area: profile.area,
      titulo,
      instituicao: instituicao || null,
      url: url || null,
      data_publicacao: dataPublicacao || null,
      verificacao_automatica_ativa: Boolean(verificacaoAutomatica) && Boolean(url),
      intervalo_verificacao_dias: intervaloDias ? Number(intervaloDias) : 30,
      status_verificacao: "nao_verificada",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ erro: error.message }, { status: 500 });
  return NextResponse.json({ fonteId: fonte.id });
}
