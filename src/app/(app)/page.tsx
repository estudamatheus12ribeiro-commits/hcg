import Link from "next/link";
import { getCurrentProfile, NOME_AREA } from "@/lib/data/profile";
import { createClient } from "@/lib/supabase/server";
import { calcularMetrica } from "@/lib/domain/stats";

export default async function InicioPage() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();

  const { data: blocoAberto } = await supabase
    .from("study_blocks")
    .select("id, criado_em")
    .eq("profile_id", profile.id)
    .eq("status", "em_andamento")
    .order("criado_em", { ascending: false })
    .limit(1)
    .maybeSingle();

  const hoje = new Date().toISOString().slice(0, 10);
  const { data: revisoesPendentes, count: totalRevisoesPendentes } = await supabase
    .from("review_queue")
    .select("*", { count: "exact" })
    .eq("profile_id", profile.id)
    .eq("status", "pendente")
    .lte("data_prevista", hoje)
    .order("data_prevista")
    .limit(5);

  const { data: ultimosBlocos } = await supabase
    .from("study_blocks")
    .select("id, criado_em, status, finalizado_em")
    .eq("profile_id", profile.id)
    .eq("status", "concluido")
    .order("finalizado_em", { ascending: false })
    .limit(5);

  const { data: attemptsRecentes } = await supabase
    .from("attempts")
    .select("categoria_resultado_atual, categoria_resultado")
    .eq("profile_id", profile.id)
    .order("respondido_em", { ascending: false })
    .limit(200);

  const metrica = calcularMetrica(attemptsRecentes ?? []);

  const { data: painelConjunto } = await supabase.rpc("painel_conjunto");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Olá, {profile.nome_exibicao}</h1>
        <p className="text-sm text-foreground-muted">Área: {NOME_AREA[profile.area]}</p>
      </div>

      <div className="rounded-xl border border-border bg-surface p-5">
        <h2 className="mb-2 text-sm font-semibold">Próxima atividade</h2>
        {blocoAberto ? (
          <div className="flex items-center justify-between">
            <p className="text-sm">Você tem um bloco em andamento, iniciado em {new Date(blocoAberto.criado_em).toLocaleString("pt-BR")}.</p>
            <Link href={`/bloco/${blocoAberto.id}`} className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white">
              Continuar
            </Link>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <p className="text-sm text-foreground-muted">Nenhum bloco em andamento.</p>
            <Link href="/bloco/novo" className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white">
              Iniciar bloco de 10 questões
            </Link>
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-surface p-5">
          <h2 className="mb-1 text-sm font-semibold">Revisões pendentes hoje</h2>
          <p className="text-3xl font-semibold">{totalRevisoesPendentes ?? 0}</p>
          <ul className="mt-2 space-y-1 text-sm text-foreground-muted">
            {(revisoesPendentes ?? []).map((r) => (
              <li key={r.id}>
                {r.assunto || r.disciplina || "Assunto geral"} — desde {new Date(r.data_prevista).toLocaleDateString("pt-BR")}
              </li>
            ))}
          </ul>
          <Link href="/revisoes" className="mt-3 inline-block text-sm text-brand underline">
            Ver fila completa
          </Link>
        </div>

        <div className="rounded-xl border border-border bg-surface p-5">
          <h2 className="mb-1 text-sm font-semibold">Progresso recente (últimas 200 respostas)</h2>
          {metrica.amostraInsuficiente ? (
            <p className="text-sm text-warning">Amostra insuficiente para uma taxa confiável ({metrica.total} respostas válidas).</p>
          ) : (
            <p className="text-2xl font-semibold">
              {metrica.percentual}%{" "}
              <span className="text-sm font-normal text-foreground-muted">
                ({metrica.acertos}/{metrica.total})
              </span>
            </p>
          )}
          <Link href="/desempenho" className="mt-3 inline-block text-sm text-brand underline">
            Ver desempenho completo
          </Link>
        </div>
      </div>

      {painelConjunto && painelConjunto.length === 2 && (
        <div className="rounded-xl border border-border bg-surface p-5">
          <h2 className="mb-2 text-sm font-semibold">Painel conjunto (constância — autorizado pelos dois)</h2>
          <div className="grid grid-cols-2 gap-3">
            {painelConjunto.map((p) => (
              <div key={p.perfil_id} className="rounded-lg bg-surface-muted p-3">
                <p className="text-sm font-medium">{p.nome_exibicao}</p>
                <p className="text-xs text-foreground-muted">{p.dias_estudo_30d} dias com estudo (30d)</p>
                <p className="text-xs text-foreground-muted">{p.blocos_concluidos_30d} blocos concluídos (30d)</p>
                <p className="text-xs text-foreground-muted">{p.metas_ativas} meta(s) ativa(s)</p>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-foreground-muted">
            Mostra apenas constância, nunca notas — provas diferentes não medem o mesmo nível de conhecimento.
          </p>
        </div>
      )}

      <div className="rounded-xl border border-border bg-surface p-5">
        <h2 className="mb-2 text-sm font-semibold">Últimos blocos concluídos</h2>
        {(ultimosBlocos ?? []).length === 0 ? (
          <p className="text-sm text-foreground-muted">Nenhum bloco concluído ainda.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {(ultimosBlocos ?? []).map((b) => (
              <li key={b.id} className="flex items-center justify-between">
                <span>{b.finalizado_em ? new Date(b.finalizado_em).toLocaleString("pt-BR") : "—"}</span>
                <Link href={`/bloco/${b.id}/resultado`} className="text-brand underline">
                  Ver diagnóstico
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
