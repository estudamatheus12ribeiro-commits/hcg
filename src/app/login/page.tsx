"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const USUARIOS = [
  { id: "matheus", nome: "Matheus", email: "matheus@hcg.local", tema: "concursos" as const },
  { id: "laura", nome: "Laura", email: "laura@hcg.local", tema: "medicina" as const },
];

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    const usuario = USUARIOS.find((u) => u.id === selecionado);
    if (!usuario) {
      setErro("Escolha um usuário.");
      return;
    }
    setCarregando(true);
    setErro(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: usuario.email,
      password: senha,
    });
    setCarregando(false);
    if (error) {
      setErro("Senha incorreta. Tente novamente.");
      return;
    }
    router.replace(params.get("next") || "/");
    router.refresh();
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">HCG Estudos</h1>
          <p className="mt-1 text-sm text-foreground-muted">
            Acesso privado — Concursos (Matheus) e Medicina (Laura)
          </p>
        </div>

        <form
          onSubmit={entrar}
          className="rounded-xl border border-border bg-surface p-6 shadow-sm space-y-5"
        >
          <div className="grid grid-cols-2 gap-3">
            {USUARIOS.map((u) => (
              <button
                type="button"
                key={u.id}
                onClick={() => setSelecionado(u.id)}
                className={`rounded-lg border px-4 py-3 text-sm font-medium transition ${
                  selecionado === u.id
                    ? u.tema === "concursos"
                      ? "border-accent-concursos bg-accent-concursos-soft text-accent-concursos"
                      : "border-accent-medicina bg-accent-medicina-soft text-accent-medicina"
                    : "border-border text-foreground-muted hover:bg-surface-muted"
                }`}
              >
                {u.nome}
              </button>
            ))}
          </div>

          <div>
            <label htmlFor="senha" className="mb-1 block text-sm font-medium">
              Senha
            </label>
            <input
              id="senha"
              type="password"
              required
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand"
            />
          </div>

          {erro && <p className="text-sm text-danger">{erro}</p>}

          <button
            type="submit"
            disabled={carregando || !selecionado}
            className="w-full rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {carregando ? "Entrando…" : "Entrar"}
          </button>

          <p className="text-center text-xs text-foreground-muted">
            Não há cadastro público. Se esqueceu a senha, troque-a em Configurações
            depois de entrar, ou peça para redefinir diretamente no Supabase.
          </p>
        </form>
      </div>
    </main>
  );
}
