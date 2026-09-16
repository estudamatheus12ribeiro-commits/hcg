"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Exam = { id: string; titulo: string; banca: string | null };

export function NovoBlocoForm({
  exams,
  disciplinas,
  assuntosMap,
}: {
  exams: Exam[];
  disciplinas: string[];
  assuntosMap: Record<string, string[]>;
}) {
  const router = useRouter();
  const [examId, setExamId] = useState("");
  const [disciplina, setDisciplina] = useState("");
  const [assunto, setAssunto] = useState("");
  const [dificuldade, setDificuldade] = useState("");
  const [origem, setOrigem] = useState<"" | "importada" | "ia" | "mista">("");
  const [modo, setModo] = useState<"estudo" | "simulado">("estudo");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  const assuntosDisponiveis = disciplina ? assuntosMap[disciplina] ?? [] : [];

  async function iniciar() {
    setCarregando(true);
    setErro(null);
    const res = await fetch("/api/blocos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        examId: examId || undefined,
        disciplina: disciplina || undefined,
        assunto: assunto || undefined,
        dificuldade: dificuldade || undefined,
        origem: origem || undefined,
        modo,
      }),
    });
    const data = await res.json();
    setCarregando(false);
    if (!res.ok) {
      setErro(data.erro || "Erro ao criar bloco.");
      return;
    }
    router.push(`/bloco/${data.blocoId}`);
  }

  return (
    <div className="space-y-4 rounded-xl border border-border bg-surface p-5">
      <div>
        <label className="mb-1 block text-sm font-medium">Prova / edital (opcional)</label>
        <select
          value={examId}
          onChange={(e) => setExamId(e.target.value)}
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
        >
          <option value="">Qualquer prova (banco geral)</option>
          {exams.map((e) => (
            <option key={e.id} value={e.id}>
              {e.titulo}
              {e.banca ? ` — ${e.banca}` : ""}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium">Disciplina</label>
          <select
            value={disciplina}
            onChange={(e) => {
              setDisciplina(e.target.value);
              setAssunto("");
            }}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
          >
            <option value="">Todas</option>
            {disciplinas.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Assunto</label>
          <select
            value={assunto}
            onChange={(e) => setAssunto(e.target.value)}
            disabled={!disciplina}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm disabled:opacity-50"
          >
            <option value="">Todos</option>
            {assuntosDisponiveis.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium">Dificuldade (estimada)</label>
          <select
            value={dificuldade}
            onChange={(e) => setDificuldade(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
          >
            <option value="">Qualquer</option>
            <option value="facil">Fácil</option>
            <option value="media">Média</option>
            <option value="dificil">Difícil</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Origem</label>
          <select
            value={origem}
            onChange={(e) => setOrigem(e.target.value as typeof origem)}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
          >
            <option value="">Importadas + IA</option>
            <option value="importada">Só importadas</option>
            <option value="ia">Só inéditas (IA)</option>
          </select>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Modo</label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setModo("estudo")}
            className={`flex-1 rounded-lg border px-3 py-2 text-sm ${
              modo === "estudo" ? "border-brand bg-surface-muted font-medium" : "border-border"
            }`}
          >
            Estudo (correção a cada questão)
          </button>
          <button
            type="button"
            onClick={() => setModo("simulado")}
            className={`flex-1 rounded-lg border px-3 py-2 text-sm ${
              modo === "simulado" ? "border-brand bg-surface-muted font-medium" : "border-border"
            }`}
          >
            Simulado (correção só no fim)
          </button>
        </div>
      </div>

      {erro && <p className="text-sm text-danger">{erro}</p>}

      <button
        onClick={iniciar}
        disabled={carregando}
        className="w-full rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
      >
        {carregando ? "Selecionando questões…" : "Iniciar bloco"}
      </button>
    </div>
  );
}
