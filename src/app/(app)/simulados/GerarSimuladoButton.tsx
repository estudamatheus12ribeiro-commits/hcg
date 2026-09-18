"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function GerarSimuladoButton({ simuladoId }: { simuladoId: string }) {
  const router = useRouter();
  const [carregando, setCarregando] = useState(false);

  async function gerar() {
    setCarregando(true);
    const res = await fetch(`/api/simulados/${simuladoId}/gerar`, { method: "POST" });
    const data = await res.json();
    setCarregando(false);
    if (res.ok) {
      router.push(`/bloco/${data.blocoId}`);
    } else {
      alert(data.erro || "Erro ao gerar simulado.");
    }
  }

  return (
    <button onClick={gerar} disabled={carregando} className="rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50">
      {carregando ? "Montando…" : "Gerar e iniciar"}
    </button>
  );
}
