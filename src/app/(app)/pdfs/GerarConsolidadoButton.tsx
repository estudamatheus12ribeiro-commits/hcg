"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function GerarConsolidadoButton({ dias }: { dias: 7 | 30 }) {
  const router = useRouter();
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function gerar() {
    setCarregando(true);
    setErro(null);
    const res = await fetch("/api/pdfs/consolidado", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dias }),
    });
    const data = await res.json();
    setCarregando(false);
    if (!res.ok) {
      setErro(data.erro || "Erro ao gerar PDF.");
      return;
    }
    router.refresh();
  }

  return (
    <div>
      <button
        onClick={gerar}
        disabled={carregando}
        className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-surface-muted disabled:opacity-50"
      >
        {carregando ? "Gerando…" : `Gerar caderno dos últimos ${dias} dias`}
      </button>
      {erro && <p className="mt-1 text-xs text-danger">{erro}</p>}
    </div>
  );
}
