"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Exam = { id: string; titulo: string };

export function NovoSimuladoForm({ exams }: { exams: Exam[] }) {
  const router = useRouter();
  const [titulo, setTitulo] = useState("");
  const [banca, setBanca] = useState("");
  const [dataProva, setDataProva] = useState("");
  const [editalExamId, setEditalExamId] = useState("");
  const [tempoLimiteMinutos, setTempoLimiteMinutos] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function criar() {
    if (!titulo) {
      setErro("Informe um título.");
      return;
    }
    setCarregando(true);
    setErro(null);
    const res = await fetch("/api/simulados", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ titulo, banca, dataProva, editalExamId, tempoLimiteMinutos }),
    });
    const data = await res.json();
    setCarregando(false);
    if (!res.ok) {
      setErro(data.erro || "Erro ao criar simulado.");
      return;
    }
    router.refresh();
    setTitulo("");
    setBanca("");
    setDataProva("");
  }

  return (
    <div className="space-y-3 rounded-xl border border-border bg-surface p-5">
      <h2 className="text-sm font-semibold">Cadastrar prova futura / simulado</h2>
      <div className="grid grid-cols-2 gap-3">
        <input placeholder="Título" value={titulo} onChange={(e) => setTitulo(e.target.value)} className="rounded-lg border border-border bg-surface px-3 py-2 text-sm" />
        <input placeholder="Banca" value={banca} onChange={(e) => setBanca(e.target.value)} className="rounded-lg border border-border bg-surface px-3 py-2 text-sm" />
        <input type="date" value={dataProva} onChange={(e) => setDataProva(e.target.value)} className="rounded-lg border border-border bg-surface px-3 py-2 text-sm" />
        <input type="number" placeholder="Tempo limite (min)" value={tempoLimiteMinutos} onChange={(e) => setTempoLimiteMinutos(e.target.value)} className="rounded-lg border border-border bg-surface px-3 py-2 text-sm" />
        <select value={editalExamId} onChange={(e) => setEditalExamId(e.target.value)} className="col-span-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm">
          <option value="">Distribuição por amostra geral importada</option>
          {exams.map((e) => (
            <option key={e.id} value={e.id}>
              Usar distribuição do edital/prova: {e.titulo}
            </option>
          ))}
        </select>
      </div>
      {erro && <p className="text-sm text-danger">{erro}</p>}
      <button onClick={criar} disabled={carregando} className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
        {carregando ? "Criando…" : "Cadastrar"}
      </button>
    </div>
  );
}
