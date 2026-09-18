import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  const body = await req.json();
  const { titulo, banca, dataProva, editalExamId, tempoLimiteMinutos } = body;
  if (!titulo) return NextResponse.json({ erro: "Título é obrigatório." }, { status: 422 });

  const { data: simulado, error } = await supabase
    .from("simulados")
    .insert({
      profile_id: user.id,
      titulo,
      banca: banca || null,
      data_prova: dataProva || null,
      edital_exam_id: editalExamId || null,
      criterio_distribuicao: editalExamId ? "edital" : "amostra_importada",
      tempo_limite_minutos: tempoLimiteMinutos ? Number(tempoLimiteMinutos) : null,
      status: "planejado",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ erro: error.message }, { status: 500 });
  return NextResponse.json({ simuladoId: simulado.id });
}
