import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { classificarResultado, sugerirCausaProvavel } from "@/lib/domain/classification";
import { medianaSegundos } from "@/lib/domain/stats";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: blockId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  const { data: bloco } = await supabase
    .from("study_blocks")
    .select("*")
    .eq("id", blockId)
    .single();
  if (!bloco) return NextResponse.json({ erro: "Bloco não encontrado." }, { status: 404 });
  if (bloco.status !== "em_andamento") {
    return NextResponse.json({ erro: "Este bloco já foi encerrado." }, { status: 409 });
  }

  const body = await req.json();
  const {
    questionId,
    alternativaId,
    semResposta,
    confianca,
    tempoAtivoSegundos,
    anotacao,
    trocouResposta,
  }: {
    questionId: string;
    alternativaId: string | null;
    semResposta: boolean;
    confianca: "certeza" | "duvida" | "chute" | null;
    tempoAtivoSegundos: number | null;
    anotacao: string | null;
    trocouResposta: boolean;
  } = body;

  const { data: question } = await supabase
    .from("questions")
    .select("id, disciplina, assunto")
    .eq("id", questionId)
    .single();
  if (!question) return NextResponse.json({ erro: "Questão não encontrada." }, { status: 404 });

  const { data: gabaritoAtivo } = await supabase
    .from("answer_keys")
    .select("*")
    .eq("question_id", questionId)
    .eq("ativo", true)
    .order("versao", { ascending: false })
    .limit(1)
    .maybeSingle();

  let alternativaEscolhida: { letra: string } | null = null;
  if (alternativaId) {
    const { data } = await supabase.from("alternatives").select("letra").eq("id", alternativaId).single();
    alternativaEscolhida = data;
  }

  const gabaritoValido =
    gabaritoAtivo &&
    gabaritoAtivo.status !== "ausente" &&
    !gabaritoAtivo.anulada &&
    gabaritoAtivo.resposta_letra;

  const correta = gabaritoValido
    ? !semResposta && alternativaEscolhida?.letra === gabaritoAtivo!.resposta_letra
    : null;

  const categoria = classificarResultado({ semResposta, correta, confianca: confianca ?? null });

  const { count: tentativasAnteriores } = await supabase
    .from("attempts")
    .select("id", { count: "exact", head: true })
    .eq("profile_id", user.id)
    .eq("question_id", questionId);

  const { data: recentes } = await supabase
    .from("attempts")
    .select("tempo_ativo_segundos, questions!inner(disciplina)")
    .eq("profile_id", user.id)
    .eq("questions.disciplina", question.disciplina ?? "")
    .not("tempo_ativo_segundos", "is", null)
    .order("respondido_em", { ascending: false })
    .limit(30);

  const tempoMediano = medianaSegundos(
    (recentes ?? []).map((r) => r.tempo_ativo_segundos as number).filter((v) => v != null),
  );

  const causaSugerida = categoria
    ? sugerirCausaProvavel({
        categoria,
        tempoAtivoSegundos: tempoAtivoSegundos ?? null,
        tempoMedianoSegundos: tempoMediano,
        trocouResposta: Boolean(trocouResposta),
        gabaritoAlterado: (gabaritoAtivo?.versao ?? 1) > 1,
      })
    : null;

  const { data: attempt, error } = await supabase
    .from("attempts")
    .insert({
      block_id: blockId,
      question_id: questionId,
      profile_id: user.id,
      alternativa_escolhida_id: alternativaId,
      sem_resposta: semResposta,
      confianca,
      tempo_ativo_segundos: tempoAtivoSegundos,
      trocou_resposta: Boolean(trocouResposta),
      anotacao,
      answer_key_versao_utilizada: gabaritoAtivo?.versao ?? null,
      categoria_resultado: categoria,
      categoria_resultado_atual: categoria,
      causa_provavel_sugerida: causaSugerida,
      is_primeira_tentativa: (tentativasAnteriores ?? 0) === 0,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ erro: error.message }, { status: 500 });

  const respostaBase = { attemptId: attempt.id, categoria };

  if (bloco.modo === "simulado") {
    return NextResponse.json(respostaBase);
  }

  // modo estudo: devolve a correção imediatamente
  const { data: alternativas } = await supabase
    .from("alternatives")
    .select("*")
    .eq("question_id", questionId)
    .order("ordem");

  return NextResponse.json({
    ...respostaBase,
    correta,
    gabarito: gabaritoValido
      ? {
          respostaLetra: gabaritoAtivo!.resposta_letra,
          justificativa: gabaritoAtivo!.justificativa,
          status: gabaritoAtivo!.status,
        }
      : null,
    alternativas,
  });
}
