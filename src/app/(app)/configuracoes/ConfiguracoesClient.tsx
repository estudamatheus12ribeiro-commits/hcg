"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { INTERVALOS_PADRAO_DIAS } from "@/lib/domain/spacedRepetition";
import type { Tables } from "@/lib/supabase/types";

export function ConfiguracoesClient({
  fontes,
  painelConjuntoAtivo,
  intervalosAtuais,
  limiteIaAtual,
}: {
  fontes: Tables<"fontes">[];
  painelConjuntoAtivo: boolean;
  intervalosAtuais: number[];
  limiteIaAtual: number;
}) {
  const router = useRouter();

  // ---- Senha ----
  const [novaSenha, setNovaSenha] = useState("");
  const [msgSenha, setMsgSenha] = useState<string | null>(null);
  async function trocarSenha() {
    if (novaSenha.length < 8) {
      setMsgSenha("A senha precisa ter ao menos 8 caracteres.");
      return;
    }
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: novaSenha });
    setMsgSenha(error ? error.message : "Senha alterada com sucesso.");
    if (!error) setNovaSenha("");
  }

  // ---- Painel conjunto ----
  const [optIn, setOptIn] = useState(painelConjuntoAtivo);
  async function alternarPainelConjunto(valor: boolean) {
    setOptIn(valor);
    await fetch("/api/configuracoes/painel-conjunto", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ optIn: valor }),
    });
    router.refresh();
  }

  // ---- Intervalos ----
  const [intervalosTexto, setIntervalosTexto] = useState(intervalosAtuais.join(", "));
  const [msgIntervalos, setMsgIntervalos] = useState<string | null>(null);
  async function salvarIntervalos() {
    const intervalos = intervalosTexto
      .split(",")
      .map((s) => Number(s.trim()))
      .filter((n) => !Number.isNaN(n) && n > 0);
    if (intervalos.length === 0) {
      setMsgIntervalos("Informe ao menos um intervalo válido.");
      return;
    }
    const res = await fetch("/api/configuracoes/intervalos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ intervalos }),
    });
    setMsgIntervalos(res.ok ? "Intervalos salvos." : "Erro ao salvar.");
    router.refresh();
  }

  // ---- Limite IA ----
  const [limite, setLimite] = useState(limiteIaAtual);
  const [msgLimite, setMsgLimite] = useState<string | null>(null);
  async function salvarLimite() {
    const res = await fetch("/api/configuracoes/limite-ia", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ limiteUsdMensal: limite }),
    });
    setMsgLimite(res.ok ? "Limite salvo." : "Erro ao salvar.");
  }

  // ---- Fontes ----
  const [tituloFonte, setTituloFonte] = useState("");
  const [instituicaoFonte, setInstituicaoFonte] = useState("");
  const [urlFonte, setUrlFonte] = useState("");
  const [verificacaoAutomatica, setVerificacaoAutomatica] = useState(false);
  const [intervaloFonte, setIntervaloFonte] = useState(30);
  async function adicionarFonte() {
    if (!tituloFonte) return;
    await fetch("/api/fontes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        titulo: tituloFonte,
        instituicao: instituicaoFonte,
        url: urlFonte,
        verificacaoAutomatica,
        intervaloDias: intervaloFonte,
      }),
    });
    setTituloFonte("");
    setInstituicaoFonte("");
    setUrlFonte("");
    router.refresh();
  }
  async function marcarVerificada(id: string) {
    await fetch(`/api/fontes/${id}/marcar-verificada`, { method: "POST" });
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-border bg-surface p-5">
        <h2 className="mb-2 text-sm font-semibold">Trocar senha</h2>
        <div className="flex gap-2">
          <input
            type="password"
            placeholder="Nova senha (mín. 8 caracteres)"
            value={novaSenha}
            onChange={(e) => setNovaSenha(e.target.value)}
            className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm"
          />
          <button onClick={trocarSenha} className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white">
            Salvar
          </button>
        </div>
        {msgSenha && <p className="mt-1 text-sm text-foreground-muted">{msgSenha}</p>}
      </section>

      <section className="rounded-xl border border-border bg-surface p-5">
        <h2 className="mb-2 text-sm font-semibold">Painel conjunto</h2>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={optIn} onChange={(e) => alternarPainelConjunto(e.target.checked)} />
          Autorizo que Matheus e Laura vejam a constância um do outro (dias de estudo, metas cumpridas) — nunca notas
          comparadas diretamente.
        </label>
      </section>

      <section className="rounded-xl border border-border bg-surface p-5">
        <h2 className="mb-2 text-sm font-semibold">Intervalos de revisão espaçada</h2>
        <p className="mb-2 text-xs text-foreground-muted">Regra inicial do sistema: {INTERVALOS_PADRAO_DIAS.join(", ")} dias.</p>
        <div className="flex gap-2">
          <input
            value={intervalosTexto}
            onChange={(e) => setIntervalosTexto(e.target.value)}
            className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm"
          />
          <button onClick={salvarIntervalos} className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white">
            Salvar
          </button>
        </div>
        {msgIntervalos && <p className="mt-1 text-sm text-foreground-muted">{msgIntervalos}</p>}
      </section>

      <section className="rounded-xl border border-border bg-surface p-5">
        <h2 className="mb-2 text-sm font-semibold">Limite de uso de IA</h2>
        <p className="mb-2 text-xs text-foreground-muted">
          Aplica-se à geração manual de questões inéditas. 0 = sem limite. Custos são estimativas, não uma promessa de
          preço exato do provedor.
        </p>
        <div className="flex gap-2">
          <input
            type="number"
            step="0.5"
            value={limite}
            onChange={(e) => setLimite(Number(e.target.value))}
            className="w-32 rounded-lg border border-border bg-surface px-3 py-2 text-sm"
          />
          <span className="self-center text-sm text-foreground-muted">US$ / mês</span>
          <button onClick={salvarLimite} className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white">
            Salvar
          </button>
        </div>
        {msgLimite && <p className="mt-1 text-sm text-foreground-muted">{msgLimite}</p>}
      </section>

      <section className="rounded-xl border border-border bg-surface p-5">
        <h2 className="mb-2 text-sm font-semibold">Fontes cadastradas</h2>
        <div className="mb-3 grid grid-cols-2 gap-2">
          <input placeholder="Título" value={tituloFonte} onChange={(e) => setTituloFonte(e.target.value)} className="rounded-lg border border-border bg-surface px-3 py-2 text-sm" />
          <input placeholder="Instituição" value={instituicaoFonte} onChange={(e) => setInstituicaoFonte(e.target.value)} className="rounded-lg border border-border bg-surface px-3 py-2 text-sm" />
          <input placeholder="URL (opcional)" value={urlFonte} onChange={(e) => setUrlFonte(e.target.value)} className="col-span-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm" />
          <label className="col-span-2 flex items-center gap-2 text-xs text-foreground-muted">
            <input type="checkbox" checked={verificacaoAutomatica} onChange={(e) => setVerificacaoAutomatica(e.target.checked)} />
            Verificar automaticamente a cada
            <input type="number" min={1} value={intervaloFonte} onChange={(e) => setIntervaloFonte(Number(e.target.value))} className="w-16 rounded border border-border bg-surface px-2 py-1" />
            dias (requer CRON_SECRET configurado e um agendador externo — ver README)
          </label>
        </div>
        <button onClick={adicionarFonte} className="mb-4 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white">
          Adicionar fonte
        </button>

        <ul className="space-y-2">
          {fontes.map((f) => (
            <li key={f.id} className="rounded-lg border border-border p-3 text-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{f.titulo}</p>
                  <p className="text-xs text-foreground-muted">
                    {f.instituicao ?? ""} {f.url ? `· ${f.url}` : ""}
                  </p>
                  <p className="text-xs text-foreground-muted">
                    Status: {f.status_verificacao === "nao_verificada" ? "atualização não verificada" : f.status_verificacao}
                    {f.ultima_execucao_em ? ` · última execução: ${new Date(f.ultima_execucao_em).toLocaleString("pt-BR")}` : ""}
                    {f.ultima_execucao_falhou ? ` · falhou: ${f.ultimo_erro}` : ""}
                  </p>
                </div>
                {f.status_verificacao !== "verificada" && (
                  <button onClick={() => marcarVerificada(f.id)} className="rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-surface-muted">
                    Marcar como verificada agora
                  </button>
                )}
              </div>
            </li>
          ))}
          {fontes.length === 0 && <p className="text-sm text-foreground-muted">Nenhuma fonte cadastrada ainda.</p>}
        </ul>
      </section>

      <section className="rounded-xl border border-border bg-surface p-5">
        <h2 className="mb-2 text-sm font-semibold">Exportar / backup</h2>
        <a href="/api/export" className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white inline-block">
          Baixar meus dados (JSON)
        </a>
      </section>
    </div>
  );
}
