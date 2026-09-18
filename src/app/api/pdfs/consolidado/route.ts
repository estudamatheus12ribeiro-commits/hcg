import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { gerarPdfCadernoDeErros } from "@/lib/pdf/cadernoDeErros";
import { agruparAttemptsParaRevisao, construirItensCaderno } from "@/lib/domain/buildCadernoItens";

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (!profile) return NextResponse.json({ erro: "Perfil não encontrado." }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const dias: number = body.dias === 30 ? 30 : 7;

  const desde = new Date();
  desde.setDate(desde.getDate() - dias);

  const { data: attempts } = await supabase
    .from("attempts")
    .select("*, questions(id, disciplina, assunto, enunciado, numero_no_caderno)")
    .eq("profile_id", profile.id)
    .gte("respondido_em", desde.toISOString());

  if (!attempts || attempts.length === 0) {
    return NextResponse.json({ erro: "Nenhuma resposta no período selecionado." }, { status: 422 });
  }

  const totais = {
    acertoSeguro: 0,
    acertoDuvida: 0,
    acertoChute: 0,
    erroDuvida: 0,
    erroConfianca: 0,
    semResposta: 0,
  };
  for (const a of attempts) {
    const cat = a.categoria_resultado_atual ?? a.categoria_resultado;
    switch (cat) {
      case "acerto_seguro": totais.acertoSeguro++; break;
      case "acerto_duvida": totais.acertoDuvida++; break;
      case "acerto_chute": totais.acertoChute++; break;
      case "erro_duvida": totais.erroDuvida++; break;
      case "erro_confianca": totais.erroConfianca++; break;
      case "sem_resposta": totais.semResposta++; break;
    }
  }

  const attemptsTyped = attempts.map((a) => ({
    ...a,
    questions: a.questions as unknown as {
      id: string;
      disciplina: string | null;
      assunto: string | null;
      enunciado: string;
      numero_no_caderno: string | null;
    } | null,
  }));
  const grupos = agruparAttemptsParaRevisao(attemptsTyped);
  const { itens, assuntosPrioritarios } = await construirItensCaderno(supabase, grupos, profile.area);

  const { data: revisoesFuturas } = await supabase
    .from("review_queue")
    .select("assunto, disciplina, data_prevista, motivo")
    .eq("profile_id", profile.id)
    .eq("status", "pendente")
    .order("data_prevista")
    .limit(15);

  const { count: versaoAnteriorCount } = await supabase
    .from("pdfs")
    .select("id", { count: "exact", head: true })
    .eq("profile_id", profile.id)
    .eq("tipo", dias === 7 ? "semanal" : "consolidado");

  const versao = (versaoAnteriorCount ?? 0) + 1;

  const pdfBuffer = await gerarPdfCadernoDeErros({
    nomeUsuario: profile.nome_exibicao,
    area: profile.area,
    provaAlvo: null,
    bancaAlvo: null,
    blocoId: `consolidado-${dias}d`,
    geradoEm: new Date(),
    modo: "consolidado",
    totais,
    assuntosPrioritarios,
    itens,
    proximasRevisoes: (revisoesFuturas ?? []).map((r) => ({
      assunto: r.assunto || r.disciplina || "Assunto geral",
      dataPrevista: new Date(r.data_prevista).toLocaleDateString("pt-BR"),
      motivo: r.motivo,
    })),
    versaoDocumento: versao,
  });

  const storagePath = `${profile.area}/${profile.id}/consolidados/${dias}d-v${versao}.pdf`;
  const { error: erroUpload } = await supabase.storage
    .from("generated")
    .upload(storagePath, pdfBuffer, { contentType: "application/pdf", upsert: true });
  if (erroUpload) return NextResponse.json({ erro: erroUpload.message }, { status: 500 });

  const { data: pdfRow, error } = await supabase
    .from("pdfs")
    .insert({
      profile_id: profile.id,
      tipo: dias === 7 ? "semanal" : "consolidado",
      titulo: `Caderno consolidado — últimos ${dias} dias — ${new Date().toLocaleDateString("pt-BR")}`,
      storage_path: storagePath,
      versao,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ erro: error.message }, { status: 500 });
  return NextResponse.json({ pdfId: pdfRow.id });
}
