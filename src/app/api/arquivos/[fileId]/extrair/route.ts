import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { extrairTextoPdf } from "@/lib/extraction/textExtractor";
import { ocrImagem } from "@/lib/extraction/ocr";
import { extrairQuestoesDoTexto } from "@/lib/extraction/questionParser";
import { extrairGabaritoDoTexto } from "@/lib/extraction/answerKeyParser";

export async function POST(_req: Request, { params }: { params: Promise<{ fileId: string }> }) {
  const { fileId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  const { data: arquivo } = await supabase.from("exam_files").select("*, exams(area)").eq("id", fileId).single();
  if (!arquivo) return NextResponse.json({ erro: "Arquivo não encontrado." }, { status: 404 });
  const area = (arquivo.exams as unknown as { area: "concursos" | "medicina" }).area;

  await supabase
    .from("exam_files")
    .update({ status: "processando", tentativas: arquivo.tentativas + 1 })
    .eq("id", fileId);

  try {
    const { data: arquivoBaixado, error: erroDownload } = await supabase.storage
      .from("imports")
      .download(arquivo.storage_path);
    if (erroDownload || !arquivoBaixado) throw new Error(erroDownload?.message ?? "Falha ao baixar arquivo.");

    const buffer = Buffer.from(await arquivoBaixado.arrayBuffer());
    const ehImagem = arquivoBaixado.type.startsWith("image/") || /\.(png|jpe?g|webp)$/i.test(arquivo.nome_original);

    let paginas: { pagina: number; texto: string }[] = [];
    let provavelEscaneado = false;
    let ocrUtilizado = false;

    if (ehImagem) {
      const ocr = await ocrImagem(buffer);
      paginas = [{ pagina: 1, texto: ocr.texto }];
      ocrUtilizado = true;
      if (ocr.confiancaMedia < 60) {
        await supabase.from("exam_extraction_flags").insert({
          exam_file_id: fileId,
          pagina: 1,
          tipo: "ilegivel",
          descricao: `OCR com confiança baixa (${ocr.confiancaMedia.toFixed(0)}%). Revise o texto manualmente.`,
        });
      }
    } else {
      const resultado = await extrairTextoPdf(buffer);
      paginas = resultado.paginas;
      provavelEscaneado = resultado.provavelEscaneado;
      if (provavelEscaneado) {
        await supabase.from("exam_extraction_flags").insert({
          exam_file_id: fileId,
          pagina: null,
          tipo: "ilegivel",
          descricao:
            "Este PDF parece ser digitalizado (pouquíssimo texto extraído). Este ambiente não rasteriza PDF em imagem — exporte as páginas como JPG/PNG e envie-as separadamente para permitir OCR.",
        });
      }
    }

    // Remove rascunhos de uma tentativa anterior deste mesmo arquivo, para evitar duplicação em novas tentativas.
    await supabase.from("questions").delete().eq("exam_file_id", fileId).eq("status", "revisao_pendente");

    let questoesInseridas = 0;
    let gabaritoBruto: ReturnType<typeof extrairGabaritoDoTexto> = [];

    if (arquivo.tipo === "prova") {
      const questoesExtraidas = extrairQuestoesDoTexto(paginas);
      for (const q of questoesExtraidas) {
        const { data: questaoInserida, error: erroQuestao } = await supabase
          .from("questions")
          .insert({
            area,
            exam_id: arquivo.exam_id,
            exam_file_id: fileId,
            numero_no_caderno: q.numeroNoCaderno,
            origem: "importada",
            enunciado: q.enunciado,
            status: "revisao_pendente",
            pagina_origem: q.pagina,
            motivo_revisao: q.motivosRevisao.join("; ") || null,
            criado_por: user.id,
          })
          .select()
          .single();
        if (erroQuestao || !questaoInserida) continue;

        if (q.alternativas.length > 0) {
          await supabase.from("alternatives").insert(
            q.alternativas.map((a, idx) => ({
              question_id: questaoInserida.id,
              letra: a.letra,
              texto: a.texto,
              ordem: idx,
            })),
          );
        }
        if (q.confiancaExtracao === "baixa") {
          await supabase.from("exam_extraction_flags").insert({
            exam_file_id: fileId,
            pagina: q.pagina,
            tipo: "associacao_duvidosa",
            descricao: `Questão nº ${q.numeroNoCaderno}: ${q.motivosRevisao.join("; ")}`,
          });
        }
        questoesInseridas++;
      }
    } else if (arquivo.tipo === "gabarito") {
      gabaritoBruto = extrairGabaritoDoTexto(paginas.map((p) => p.texto).join("\n"));
      if (gabaritoBruto.length === 0) {
        await supabase.from("exam_extraction_flags").insert({
          exam_file_id: fileId,
          pagina: null,
          tipo: "ilegivel",
          descricao: "Não foi possível identificar linhas de gabarito no padrão esperado (número + letra).",
        });
      }
    }

    await supabase
      .from("exam_files")
      .update({
        status: "revisao_pendente",
        ocr_utilizado: ocrUtilizado,
        processado_em: new Date().toISOString(),
        extracao_bruta: { totalPaginas: paginas.length, provavelEscaneado, gabarito: gabaritoBruto },
      })
      .eq("id", fileId);

    return NextResponse.json({
      status: "revisao_pendente",
      questoesInseridas,
      gabarito: gabaritoBruto,
      provavelEscaneado,
    });
  } catch (e) {
    await supabase
      .from("exam_files")
      .update({ status: "erro", erro_mensagem: e instanceof Error ? e.message : "Erro desconhecido." })
      .eq("id", fileId);
    return NextResponse.json({ erro: e instanceof Error ? e.message : "Erro na extração." }, { status: 500 });
  }
}
