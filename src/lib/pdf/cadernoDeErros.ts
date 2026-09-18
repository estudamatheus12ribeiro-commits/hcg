import PDFDocument from "pdfkit";
import { ROTULOS_CATEGORIA, ROTULOS_CAUSA } from "@/lib/domain/classification";

// A fonte padrão (Helvetica/WinAnsi) não cobre todo o Unicode — troca símbolos
// comuns que a IA ou textos importados podem gerar por equivalentes seguros,
// para nunca corromper o PDF final.
const SUBSTITUICOES_SEGURAS: [RegExp, string][] = [
  [/→|➔|⇒/g, "->"],
  [/←|⇐/g, "<-"],
  [/↔/g, "<->"],
  [/[✓✔]/g, "OK"],
  [/[✗✘]/g, "X"],
  [/[""]/g, '"'],
  [/['']/g, "'"],
];

function s(texto: string | null | undefined): string {
  if (!texto) return "";
  let out = texto;
  for (const [re, rep] of SUBSTITUICOES_SEGURAS) out = out.replace(re, rep);
  return out;
}

export type ItemCadernoPdf = {
  numeroNoCaderno: string | null;
  disciplina: string | null;
  assunto: string | null;
  enunciadoResumo: string;
  alternativaEscolhidaTexto: string | null;
  alternativaCorretaTexto: string | null;
  categoria: string;
  causaProvavel: string | null;
  explicacao: string; // por que a correta está certa e a escolhida está errada
  resumoTeorico: string;
  perguntaRecuperacao: string;
  respostaRecuperacao: string;
  fontes: { titulo: string; instituicao: string | null; dataConsulta: string | null; statusVerificacao: string }[];
};

export type CadernoPdfInput = {
  nomeUsuario: string;
  area: "concursos" | "medicina";
  provaAlvo: string | null;
  bancaAlvo: string | null;
  blocoId: string;
  geradoEm: Date;
  modo: string;
  totais: {
    acertoSeguro: number;
    acertoDuvida: number;
    acertoChute: number;
    erroDuvida: number;
    erroConfianca: number;
    semResposta: number;
  };
  assuntosPrioritarios: string[];
  itens: ItemCadernoPdf[]; // erros e dúvidas, já agrupados/deduplicados por assunto quando semelhantes
  proximasRevisoes: { assunto: string; dataPrevista: string; motivo: string }[];
  versaoDocumento: number;
};

const COR_TEXTO = "#17181c";
const COR_MUTED = "#5b5d66";
const COR_ACCENT = { concursos: "#2451b5", medicina: "#0d7d6f" } as const;

export async function gerarPdfCadernoDeErros(input: CadernoPdfInput): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: 56, bottom: 56, left: 56, right: 56 },
      info: {
        Title: `Caderno de revisão — ${input.provaAlvo ?? "Banco de questões"} — Bloco ${input.blocoId.slice(0, 8)}`,
        Author: input.nomeUsuario,
        Subject: "HCG Estudos — Caderno de erros e dúvidas",
      },
    });

    const chunks: Buffer[] = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const accent = COR_ACCENT[input.area];

    // ===== Cabeçalho =====
    doc.rect(0, 0, doc.page.width, 90).fill(accent);
    doc
      .fillColor("#ffffff")
      .fontSize(18)
      .font("Helvetica-Bold")
      .text("HCG Estudos — Caderno de Erros e Dúvidas", 56, 28);
    doc
      .fontSize(10)
      .font("Helvetica")
      .text(
        `${s(input.nomeUsuario)} · ${s(input.provaAlvo) || "Banco de questões"}${
          input.bancaAlvo ? " · Banca: " + s(input.bancaAlvo) : ""
        }`,
        56,
        56,
      );
    doc.fillColor(COR_TEXTO);
    doc.moveDown(3);

    doc
      .fontSize(9)
      .fillColor(COR_MUTED)
      .text(
        `Gerado em ${input.geradoEm.toLocaleString("pt-BR")} · Modo: ${input.modo} · Bloco ${input.blocoId} · Versão do documento: ${input.versaoDocumento}`,
      );
    doc.moveDown(1);

    // ===== Resultado do bloco =====
    doc.fontSize(13).fillColor(COR_TEXTO).font("Helvetica-Bold").text("Resultado deste bloco");
    doc.moveDown(0.3);
    doc.font("Helvetica").fontSize(10);
    const t = input.totais;
    const linhas = [
      `Acerto com segurança: ${t.acertoSeguro}`,
      `Acerto com dúvida: ${t.acertoDuvida}`,
      `Acerto por chute (não comprova domínio): ${t.acertoChute}`,
      `Erro com dúvida: ${t.erroDuvida}`,
      `Erro com alta confiança: ${t.erroConfianca}`,
      `Sem resposta: ${t.semResposta}`,
    ];
    for (const l of linhas) doc.text("•  " + l);
    doc.moveDown(0.8);

    if (input.assuntosPrioritarios.length > 0) {
      doc.font("Helvetica-Bold").fontSize(11).text("Assuntos prioritários para revisão");
      doc.font("Helvetica").fontSize(10);
      doc.text(input.assuntosPrioritarios.map(s).join(", "));
      doc.moveDown(0.8);
    }

    doc.moveTo(56, doc.y).lineTo(doc.page.width - 56, doc.y).strokeColor("#e2e2df").stroke();
    doc.moveDown(1);

    // ===== Itens (erros e dúvidas) =====
    if (input.itens.length === 0) {
      doc
        .font("Helvetica-Bold")
        .fontSize(12)
        .text("Sem erros ou dúvidas neste bloco.");
      doc
        .font("Helvetica")
        .fontSize(10)
        .fillColor(COR_MUTED)
        .text(
          "Revisão breve de consolidação: mantenha o ritmo e use os assuntos já dominados como base para os próximos blocos, priorizando novidade de conteúdo.",
        );
      doc.fillColor(COR_TEXTO);
    } else {
      doc.font("Helvetica-Bold").fontSize(13).text("Erros e dúvidas — erro identificado -> conceito -> como reconhecer");
      doc.moveDown(0.5);

      input.itens.forEach((item, idx) => {
        if (doc.y > doc.page.height - 200) doc.addPage();

        doc
          .font("Helvetica-Bold")
          .fontSize(11)
          .fillColor(accent)
          .text(
            `${idx + 1}. Q${item.numeroNoCaderno ?? "?"} — ${s(item.disciplina) || "Disciplina não informada"}${
              item.assunto ? " / " + s(item.assunto) : ""
            }`,
          );
        doc.fillColor(COR_TEXTO).font("Helvetica").fontSize(9.5);
        doc.text(`Categoria: ${ROTULOS_CATEGORIA[item.categoria as keyof typeof ROTULOS_CATEGORIA] ?? item.categoria}` +
          (item.causaProvavel ? ` · Causa provável: ${ROTULOS_CAUSA[item.causaProvavel as keyof typeof ROTULOS_CAUSA] ?? item.causaProvavel}` : ""));
        doc.moveDown(0.2);

        doc.font("Helvetica-Bold").fontSize(9.5).text("Enunciado (resumo): ", { continued: true }).font("Helvetica").text(s(item.enunciadoResumo));
        doc.font("Helvetica-Bold").text("Resposta marcada: ", { continued: true }).font("Helvetica").text(s(item.alternativaEscolhidaTexto) || "(sem resposta)");
        doc.font("Helvetica-Bold").text("Resposta de referência: ", { continued: true }).font("Helvetica").text(s(item.alternativaCorretaTexto) || "(gabarito ausente)");
        doc.moveDown(0.2);

        doc.font("Helvetica-Bold").fontSize(9.5).text("Conceito necessário:");
        doc.font("Helvetica").text(s(item.explicacao));
        doc.moveDown(0.2);

        doc.font("Helvetica-Bold").fontSize(9.5).text("Resumo teórico direcionado:");
        doc.font("Helvetica").text(s(item.resumoTeorico));
        doc.moveDown(0.2);

        doc.font("Helvetica-Bold").fontSize(9.5).fillColor(accent).text("Como reconhecer na próxima questão:");
        doc.fillColor(COR_TEXTO).font("Helvetica").text(`Pergunta: ${s(item.perguntaRecuperacao)}`);
        doc.font("Helvetica-Oblique").fillColor(COR_MUTED).text(`Resposta: ${s(item.respostaRecuperacao)}`);
        doc.fillColor(COR_TEXTO);

        if (item.fontes.length > 0) {
          doc.font("Helvetica").fontSize(8).fillColor(COR_MUTED);
          for (const f of item.fontes) {
            doc.text(
              `Fonte: ${s(f.titulo)}${f.instituicao ? " — " + s(f.instituicao) : ""}${
                f.dataConsulta ? " (consultado em " + f.dataConsulta + ")" : ""
              } · ${f.statusVerificacao}`,
            );
          }
          doc.fillColor(COR_TEXTO);
        }

        doc.moveDown(0.6);
        doc.moveTo(56, doc.y).lineTo(doc.page.width - 56, doc.y).strokeColor("#e2e2df").stroke();
        doc.moveDown(0.6);
      });
    }

    // ===== Próximas revisões =====
    if (doc.y > doc.page.height - 180) doc.addPage();
    doc.font("Helvetica-Bold").fontSize(13).text("Próximas revisões agendadas");
    doc.font("Helvetica").fontSize(10);
    if (input.proximasRevisoes.length === 0) {
      doc.fillColor(COR_MUTED).text("Nenhuma revisão pendente gerada a partir deste bloco.");
      doc.fillColor(COR_TEXTO);
    } else {
      for (const r of input.proximasRevisoes) {
        doc.text(`•  ${s(r.assunto)} — previsto para ${r.dataPrevista}. ${s(r.motivo)}`);
      }
    }

    doc.end();
  });
}
