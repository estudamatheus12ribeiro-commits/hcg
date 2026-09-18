"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function GerarQuestoesForm({ disciplinas }: { disciplinas: string[] }) {
  const router = useRouter();
  const [disciplina, setDisciplina] = useState("");
  const [assunto, setAssunto] = useState("");
  const [banca, setBanca] = useState("");
  const [quantidade, setQuantidade] = useState(3);
  const [carregando, setCarregando] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function gerar() {
    if (!disciplina || !assunto) {
      setErro("Informe disciplina e assunto.");
      return;
    }
    setCarregando(true);
    setErro(null);
    setMensagem(null);
    const res = await fetch("/api/ia/gerar-questoes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ disciplina, assunto, banca: banca || undefined, quantidade }),
    });
    const data = await res.json();
    setCarregando(false);
    if (!res.ok) {
      setErro(data.erro || "Erro ao gerar questões.");
      return;
    }
    setMensagem(
      `${data.geradas} questão(ões) gerada(s) e aguardando revisão. Custo estimado: US$ ${data.custoEstimadoUsd?.toFixed(4) ?? "0"}.`,
    );
    router.refresh();
  }

  return (
    <div className="space-y-3 rounded-xl border border-border bg-surface p-5">
      <h2 className="text-sm font-semibold">Gerar questões inéditas por IA</h2>
      <p className="text-xs text-foreground-muted">
        A análise de incidência usa apenas as provas já importadas e confirmadas desta área. Questões geradas ficam
        pendentes de revisão e fora da pontuação até você confirmar.
      </p>
      <div className="grid grid-cols-2 gap-3">
        <input
          list="disciplinas"
          placeholder="Disciplina"
          value={disciplina}
          onChange={(e) => setDisciplina(e.target.value)}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
        />
        <datalist id="disciplinas">
          {disciplinas.map((d) => (
            <option key={d} value={d} />
          ))}
        </datalist>
        <input
          placeholder="Assunto"
          value={assunto}
          onChange={(e) => setAssunto(e.target.value)}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
        />
        <input
          placeholder="Banca (opcional)"
          value={banca}
          onChange={(e) => setBanca(e.target.value)}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
        />
        <input
          type="number"
          min={1}
          max={10}
          value={quantidade}
          onChange={(e) => setQuantidade(Number(e.target.value))}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
        />
      </div>
      {erro && <p className="text-sm text-danger">{erro}</p>}
      {mensagem && <p className="text-sm text-success">{mensagem}</p>}
      <button
        onClick={gerar}
        disabled={carregando}
        className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {carregando ? "Gerando…" : "Gerar questões"}
      </button>
    </div>
  );
}
