"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function IniciarRevisaoButton({ disciplina, assunto }: { disciplina: string | null; assunto: string | null }) {
  const router = useRouter();
  const [carregando, setCarregando] = useState(false);

  async function iniciar() {
    setCarregando(true);
    const res = await fetch("/api/blocos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ disciplina: disciplina || undefined, assunto: assunto || undefined, modo: "estudo" }),
    });
    const data = await res.json();
    setCarregando(false);
    if (res.ok) {
      router.push(`/bloco/${data.blocoId}`);
    } else {
      alert(data.erro || "Não foi possível iniciar a revisão.");
    }
  }

  return (
    <button
      onClick={iniciar}
      disabled={carregando}
      className="rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
    >
      {carregando ? "Selecionando…" : "Revisar agora"}
    </button>
  );
}
