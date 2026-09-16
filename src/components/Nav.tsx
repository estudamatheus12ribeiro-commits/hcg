"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Enums } from "@/lib/supabase/types";

type Item = { href: string; label: string };

const ITENS: Item[] = [
  { href: "/", label: "Início" },
  { href: "/concursos", label: "Concursos — Matheus" },
  { href: "/medicina", label: "Medicina — Laura" },
  { href: "/questoes", label: "Banco de questões" },
  { href: "/provas", label: "Provas e editais" },
  { href: "/caderno-de-erros", label: "Caderno de erros" },
  { href: "/pdfs", label: "Biblioteca de PDFs" },
  { href: "/revisoes", label: "Revisões" },
  { href: "/simulados", label: "Simulados" },
  { href: "/desempenho", label: "Desempenho" },
  { href: "/configuracoes", label: "Configurações" },
];

export function Nav({ nome, area }: { nome: string; area: Enums<"area_estudo"> }) {
  const pathname = usePathname();
  const router = useRouter();
  const tema =
    area === "concursos"
      ? {
          dot: "bg-accent-concursos",
          ativo: "bg-accent-concursos-soft text-accent-concursos font-medium",
        }
      : {
          dot: "bg-accent-medicina",
          ativo: "bg-accent-medicina-soft text-accent-medicina font-medium",
        };

  async function sair() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <header className="border-b border-border bg-surface no-print">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${tema.dot}`} />
          <span className="text-sm font-semibold tracking-tight">HCG Estudos</span>
          <span className="text-sm text-foreground-muted">· {nome}</span>
        </div>
        <button
          onClick={sair}
          className="text-xs text-foreground-muted hover:text-foreground"
        >
          Sair
        </button>
      </div>
      <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 pb-2 text-sm">
        {ITENS.map((item) => {
          const ativo = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`whitespace-nowrap rounded-md px-3 py-1.5 transition ${
                ativo ? tema.ativo : "text-foreground-muted hover:bg-surface-muted"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
