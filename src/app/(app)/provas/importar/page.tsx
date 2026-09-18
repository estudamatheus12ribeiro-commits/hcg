"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ImportarProvaPage() {
  const router = useRouter();
  const [titulo, setTitulo] = useState("");
  const [banca, setBanca] = useState("");
  const [instituicao, setInstituicao] = useState("");
  const [ano, setAno] = useState("");
  const [cargoOuExame, setCargoOuExame] = useState("");
  const [tipoCaderno, setTipoCaderno] = useState("");
  const [numeroCaderno, setNumeroCaderno] = useState("");
  const [arquivoProva, setArquivoProva] = useState<File | null>(null);
  const [arquivoGabarito, setArquivoGabarito] = useState<File | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [progresso, setProgresso] = useState<string | null>(null);

  async function enviar() {
    if (!titulo) {
      setErro("Informe um título para a prova.");
      return;
    }
    setErro(null);
    setCarregando(true);
    try {
      setProgresso("Criando registro da prova…");
      const resExam = await fetch("/api/provas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ titulo, banca, instituicao, ano, cargoOuExame, tipoCaderno, numeroCaderno }),
      });
      const examData = await resExam.json();
      if (!resExam.ok) throw new Error(examData.erro);
      const examId = examData.examId;

      async function subirEExtrair(file: File, tipo: string) {
        setProgresso(`Enviando ${tipo}…`);
        const form = new FormData();
        form.append("arquivo", file);
        form.append("tipo", tipo);
        const resUp = await fetch(`/api/provas/${examId}/arquivos`, { method: "POST", body: form });
        const upData = await resUp.json();
        if (!resUp.ok) throw new Error(upData.erro);
        setProgresso(`Extraindo texto do ${tipo}…`);
        const resEx = await fetch(`/api/arquivos/${upData.fileId}/extrair`, { method: "POST" });
        const exData = await resEx.json();
        if (!resEx.ok) throw new Error(exData.erro);
      }

      if (arquivoProva) await subirEExtrair(arquivoProva, "prova");
      if (arquivoGabarito) await subirEExtrair(arquivoGabarito, "gabarito");

      router.push(`/provas/${examId}`);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao importar.");
    } finally {
      setCarregando(false);
      setProgresso(null);
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <h1 className="text-xl font-semibold">Importar prova</h1>
      <p className="text-sm text-foreground-muted">
        Envie o arquivo da prova e, se tiver, o gabarito em separado. PDFs de texto são extraídos automaticamente;
        páginas escaneadas exigem envio como imagem (JPG/PNG) para OCR. Você confere tudo na próxima tela antes de
        qualquer questão contar para as estatísticas.
      </p>

      <div className="space-y-3 rounded-xl border border-border bg-surface p-5">
        <input
          placeholder="Título da prova (obrigatório)"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
        />
        <div className="grid grid-cols-2 gap-3">
          <input placeholder="Banca" value={banca} onChange={(e) => setBanca(e.target.value)} className="rounded-lg border border-border bg-surface px-3 py-2 text-sm" />
          <input placeholder="Instituição" value={instituicao} onChange={(e) => setInstituicao(e.target.value)} className="rounded-lg border border-border bg-surface px-3 py-2 text-sm" />
          <input placeholder="Ano" value={ano} onChange={(e) => setAno(e.target.value)} className="rounded-lg border border-border bg-surface px-3 py-2 text-sm" />
          <input placeholder="Cargo / exame" value={cargoOuExame} onChange={(e) => setCargoOuExame(e.target.value)} className="rounded-lg border border-border bg-surface px-3 py-2 text-sm" />
          <input placeholder="Tipo de caderno" value={tipoCaderno} onChange={(e) => setTipoCaderno(e.target.value)} className="rounded-lg border border-border bg-surface px-3 py-2 text-sm" />
          <input placeholder="Número do caderno" value={numeroCaderno} onChange={(e) => setNumeroCaderno(e.target.value)} className="rounded-lg border border-border bg-surface px-3 py-2 text-sm" />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Arquivo da prova (PDF ou imagem)</label>
          <input type="file" accept=".pdf,image/*" onChange={(e) => setArquivoProva(e.target.files?.[0] ?? null)} className="w-full text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Arquivo do gabarito (opcional, separado)</label>
          <input type="file" accept=".pdf,image/*" onChange={(e) => setArquivoGabarito(e.target.files?.[0] ?? null)} className="w-full text-sm" />
        </div>

        {erro && <p className="text-sm text-danger">{erro}</p>}
        {progresso && <p className="text-sm text-foreground-muted">{progresso}</p>}

        <button
          onClick={enviar}
          disabled={carregando}
          className="w-full rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {carregando ? "Processando…" : "Importar e extrair"}
        </button>
      </div>
    </div>
  );
}
