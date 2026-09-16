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
  const { titulo, banca, instituicao, ano, cargoOuExame, tipoCaderno, numeroCaderno, editalUrl } = body;

  if (!titulo) return NextResponse.json({ erro: "Título é obrigatório." }, { status: 422 });

  const { data: exam, error } = await supabase
    .from("exams")
    .insert({
      area: profile.area,
      titulo,
      banca: banca || null,
      instituicao: instituicao || null,
      ano: ano ? Number(ano) : null,
      cargo_ou_exame: cargoOuExame || null,
      tipo_caderno: tipoCaderno || null,
      numero_caderno: numeroCaderno || null,
      edital_url: editalUrl || null,
      criado_por: profile.id,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ erro: error.message }, { status: 500 });
  return NextResponse.json({ examId: exam.id });
}
