import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";

// Rotina periódica de verificação de fontes cadastradas. Deve ser chamada por
// um agendador externo (Vercel Cron, GitHub Actions, cron do próprio host)
// com o cabeçalho Authorization: Bearer <CRON_SECRET>. Nunca reescreve
// PDFs/conteúdo já gerados — apenas atualiza o status da fonte.
export async function POST(req: Request) {
  const segredoConfigurado = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!segredoConfigurado || auth !== `Bearer ${segredoConfigurado}`) {
    return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
  }

  const supabase = createAdminClient();

  const { data: fontes } = await supabase
    .from("fontes")
    .select("*")
    .eq("verificacao_automatica_ativa", true);

  const resultados: { id: string; titulo: string; ok: boolean; mudou?: boolean; erro?: string }[] = [];

  for (const fonte of fontes ?? []) {
    const ultimaExecucao = fonte.ultima_execucao_em ? new Date(fonte.ultima_execucao_em) : null;
    const proximaExecucao = ultimaExecucao
      ? new Date(ultimaExecucao.getTime() + fonte.intervalo_verificacao_dias * 86400000)
      : null;
    if (proximaExecucao && proximaExecucao > new Date()) continue; // ainda não venceu o intervalo
    if (!fonte.url) continue;

    try {
      const resposta = await fetch(fonte.url, {
        method: "GET",
        signal: AbortSignal.timeout(15000),
        headers: { "User-Agent": "HCG-Estudos-VerificadorDeFontes/1.0" },
      });
      if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
      const corpo = await resposta.text();
      const hash = createHash("sha256").update(corpo).digest("hex");
      const mudou = fonte.ultimo_hash_conteudo != null && fonte.ultimo_hash_conteudo !== hash;

      await supabase
        .from("fontes")
        .update({
          ultima_execucao_em: new Date().toISOString(),
          ultima_execucao_falhou: false,
          ultimo_erro: null,
          ultimo_hash_conteudo: hash,
          // se o conteúdo mudou desde a última verificação humana, não presumimos que
          // continua correto — volta para "desatualizada" até confirmação manual.
          status_verificacao: mudou && fonte.status_verificacao === "verificada" ? "desatualizada" : fonte.status_verificacao,
        })
        .eq("id", fonte.id);

      resultados.push({ id: fonte.id, titulo: fonte.titulo, ok: true, mudou });
    } catch (e) {
      await supabase
        .from("fontes")
        .update({
          ultima_execucao_em: new Date().toISOString(),
          ultima_execucao_falhou: true,
          ultimo_erro: e instanceof Error ? e.message : "Erro desconhecido",
        })
        .eq("id", fonte.id);
      resultados.push({ id: fonte.id, titulo: fonte.titulo, ok: false, erro: e instanceof Error ? e.message : "Erro" });
    }
  }

  return NextResponse.json({ verificadas: resultados.length, resultados });
}
