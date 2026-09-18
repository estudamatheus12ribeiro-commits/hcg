import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Exporta todos os dados pessoais do usuário autenticado (respostas, blocos,
// diagnósticos, revisões, metas, simulados, configurações, PDFs e questões
// confirmadas da sua área) como um único JSON — serve tanto de backup quanto
// de portabilidade dos dados.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (!profile) return NextResponse.json({ erro: "Perfil não encontrado." }, { status: 404 });

  const [attempts, blocks, diagnostics, reviewQueue, goals, simulados, settings, pdfs, exams, questions] =
    await Promise.all([
      supabase.from("attempts").select("*").eq("profile_id", profile.id),
      supabase.from("study_blocks").select("*").eq("profile_id", profile.id),
      supabase.from("diagnostics").select("*").eq("profile_id", profile.id),
      supabase.from("review_queue").select("*").eq("profile_id", profile.id),
      supabase.from("goals").select("*").eq("profile_id", profile.id),
      supabase.from("simulados").select("*").eq("profile_id", profile.id),
      supabase.from("settings").select("*").eq("profile_id", profile.id),
      supabase.from("pdfs").select("*").eq("profile_id", profile.id),
      supabase.from("exams").select("*").eq("area", profile.area),
      supabase.from("questions").select("*").eq("area", profile.area),
    ]);

  const pacote = {
    exportadoEm: new Date().toISOString(),
    perfil: profile,
    attempts: attempts.data,
    studyBlocks: blocks.data,
    diagnostics: diagnostics.data,
    reviewQueue: reviewQueue.data,
    goals: goals.data,
    simulados: simulados.data,
    settings: settings.data,
    pdfs: pdfs.data,
    examsDaArea: exams.data,
    questionsDaArea: questions.data,
  };

  return new NextResponse(JSON.stringify(pacote, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="hcg-estudos-backup-${profile.area}-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}
