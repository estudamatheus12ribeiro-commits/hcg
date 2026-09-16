import { PDFParse } from "pdf-parse";

export type PaginaTexto = { pagina: number; texto: string };

export type ResultadoExtracaoTexto = {
  paginas: PaginaTexto[];
  textoCompleto: string;
  provavelEscaneado: boolean; // pouco texto por página => provavelmente exige OCR
};

const MIN_CHARS_POR_PAGINA = 40;

export async function extrairTextoPdf(buffer: Buffer): Promise<ResultadoExtracaoTexto> {
  const parser = new PDFParse({ data: buffer });
  try {
    const resultado = await parser.getText();
    const paginas: PaginaTexto[] = resultado.pages.map((p) => ({
      pagina: p.num,
      texto: p.text.trim(),
    }));

    const paginasComPoucoTexto = paginas.filter(
      (p) => p.texto.length < MIN_CHARS_POR_PAGINA,
    ).length;
    const provavelEscaneado =
      paginas.length > 0 && paginasComPoucoTexto / paginas.length > 0.6;

    return {
      paginas,
      textoCompleto: resultado.text,
      provavelEscaneado,
    };
  } finally {
    await parser.destroy();
  }
}
