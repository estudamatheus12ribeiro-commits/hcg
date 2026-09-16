import { createWorker } from "tesseract.js";

/**
 * OCR de uma imagem de página (JPG/PNG). Usado quando o PDF é escaneado —
 * este ambiente não rasteriza PDF em imagem, então páginas escaneadas devem
 * ser enviadas já como arquivos de imagem (ver aviso na tela de importação).
 */
export async function ocrImagem(buffer: Buffer): Promise<{ texto: string; confiancaMedia: number }> {
  const worker = await createWorker("por");
  try {
    const { data } = await worker.recognize(buffer);
    return { texto: data.text, confiancaMedia: data.confidence };
  } finally {
    await worker.terminate();
  }
}
