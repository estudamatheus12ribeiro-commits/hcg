"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function RevisarQuestaoCard({
  id,
  enunciado,
  disciplina,
  assunto,
  dificuldade,
  alternativas,
  respostaLetra,
  justificativa,
}: {
  id: string;
  enunciado: string;
  disciplina: string | null;
  assunto: string | null;
  dificuldade: string;
  alternativas: { letra: string; texto: string }[];
  respostaLetra: string | null;
  justificativa: string | null;
}) {
  const router = useRouter();
  const [carregando, setCarregando] = useState(false);

  async function agir(acao: "confirmar" | "descartar") {
    setCarregando(true);
    await fetch(`/api/questoes/${id}/revisar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ acao }),
    });
    setCarregando(false);
    router.refresh();
  }

  return (
    <div className="rounded-lg border border-border p-3">
      <p className="mb-1 text-xs font-medium text-foreground-muted">
        {disciplina} {assunto ? `· ${assunto}` : ""} · dificuldade estimada: {dificuldade}
      </p>
      <p className="mb-2 text-sm">{enunciado}</p>
      <ul className="mb-2 space-y-0.5 text-sm">
        {alternativas.map((a) => (
          <li key={a.letra} className={a.letra === respostaLetra ? "font-medium text-success" : ""}>
            {a.letra}) {a.texto}
          </li>
        ))}
      </ul>
      {justificativa && <p className="mb-2 text-xs text-foreground-muted">{justificativa}</p>}
      <div className="flex gap-2">
        <button
          onClick={() => agir("confirmar")}
          disabled={carregando}
          className="rounded-lg bg-success px-3 py-1.5 text-xs font-medium text-white"
        >
          Confirmar e liberar para uso
        </button>
        <button
          onClick={() => agir("descartar")}
          disabled={carregando}
          className="rounded-lg border border-border px-3 py-1.5 text-xs"
        >
          Descartar
        </button>
      </div>
    </div>
  );
}
