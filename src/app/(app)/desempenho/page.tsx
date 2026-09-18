import { getCurrentProfile } from "@/lib/data/profile";
import { createClient } from "@/lib/supabase/server";
import { calcularMetrica, agruparPor, medianaSegundos, AMOSTRA_MINIMA } from "@/lib/domain/stats";

function Metrica({ titulo, dados }: { titulo: string; dados: ReturnType<typeof calcularMetrica> }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-3">
      <p className="text-sm font-medium">{titulo}</p>
      {dados.amostraInsuficiente ? (
        <p className="text-sm text-warning">Amostra insuficiente ({dados.total}/{AMOSTRA_MINIMA} respostas válidas)</p>
      ) : (
        <p className="text-sm text-foreground-muted">
          {dados.percentual}% — {dados.acertos}/{dados.total}
          {dados.invalidas > 0 ? ` (+${dados.invalidas} sem gabarito, não contadas)` : ""}
        </p>
      )}
    </div>
  );
}

export default async function DesempenhoPage() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();

  const { data: attempts } = await supabase
    .from("attempts")
    .select(
      "id, categoria_resultado_atual, categoria_resultado, confianca, tempo_ativo_segundos, is_primeira_tentativa, respondido_em, questions(disciplina, assunto, origem, exam_id, exams(banca, titulo))",
    )
    .eq("profile_id", profile.id);

  const todas = attempts ?? [];
  const geral = calcularMetrica(todas);

  const porDisciplina = agruparPor(todas, (a) => (a.questions as unknown as { disciplina: string | null } | null)?.disciplina ?? null);
  const porBanca = agruparPor(
    todas,
    (a) => (a.questions as unknown as { exams: { banca: string | null } | null } | null)?.exams?.banca ?? null,
  );
  const porProva = agruparPor(
    todas,
    (a) => (a.questions as unknown as { exams: { titulo: string } | null } | null)?.exams?.titulo ?? null,
  );

  const primeiraTentativa = todas.filter((a) => a.is_primeira_tentativa);
  const novasTentativas = todas.filter((a) => !a.is_primeira_tentativa);

  const ineditas = todas.filter((a) => (a.questions as unknown as { origem: string } | null)?.origem === "ia");
  const importadas = todas.filter((a) => (a.questions as unknown as { origem: string } | null)?.origem === "importada");

  const tempos = todas.map((a) => a.tempo_ativo_segundos).filter((t): t is number => t != null);
  const tempoMediano = medianaSegundos(tempos);

  const porConfianca = agruparPor(
    todas.filter((a) => a.confianca),
    (a) => a.confianca as string,
  );

  const diasComEstudo = new Set(
    todas
      .filter((a) => {
        const d = new Date(a.respondido_em);
        const trintaDiasAtras = new Date();
        trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);
        return d >= trintaDiasAtras;
      })
      .map((a) => a.respondido_em.slice(0, 10)),
  );

  // evolução semanal (últimas 8 semanas)
  const semanas: { inicio: Date; itens: typeof todas }[] = [];
  for (let i = 7; i >= 0; i--) {
    const inicio = new Date();
    inicio.setDate(inicio.getDate() - i * 7 - inicio.getDay());
    inicio.setHours(0, 0, 0, 0);
    const fim = new Date(inicio);
    fim.setDate(fim.getDate() + 7);
    semanas.push({
      inicio,
      itens: todas.filter((a) => {
        const d = new Date(a.respondido_em);
        return d >= inicio && d < fim;
      }),
    });
  }

  const { data: goals } = await supabase.from("goals").select("*").eq("profile_id", profile.id).eq("ativa", true);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold">Desempenho</h1>
        <p className="text-sm text-foreground-muted">
          Todos os números abaixo vêm diretamente das respostas registradas (numerador/denominador reais), sem
          estimativas de nota oficial, ranking ou percentil.
        </p>
      </div>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-foreground-muted">Geral</h2>
        <Metrica titulo="Taxa de acerto (todas as respostas com gabarito confirmado)" dados={geral} />
        <p className="mt-2 text-sm text-foreground-muted">
          Tempo mediano por questão: {tempoMediano != null ? `${tempoMediano}s` : "amostra insuficiente"}
        </p>
        <p className="text-sm text-foreground-muted">Dias com estudo nos últimos 30 dias: {diasComEstudo.size}</p>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-foreground-muted">Primeira tentativa vs. repetição</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Metrica titulo="Primeira tentativa" dados={calcularMetrica(primeiraTentativa)} />
          <Metrica titulo="Tentativas repetidas (retenção)" dados={calcularMetrica(novasTentativas)} />
        </div>
        <p className="mt-1 text-xs text-foreground-muted">
          Um acerto ao repetir imediatamente a mesma questão não comprova retenção — retenção real é medida em
          revisões posteriores, idealmente com questões diferentes sobre o mesmo conceito.
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-foreground-muted">Questões inéditas (IA) vs. importadas</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Metrica titulo="Inéditas (geradas por IA)" dados={calcularMetrica(ineditas)} />
          <Metrica titulo="Importadas de provas reais" dados={calcularMetrica(importadas)} />
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-foreground-muted">Acertos por nível de confiança declarado</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {["certeza", "duvida", "chute"].map((c) => (
            <Metrica key={c} titulo={c === "certeza" ? "Certeza" : c === "duvida" ? "Dúvida" : "Chute"} dados={calcularMetrica(porConfianca[c] ?? [])} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-foreground-muted">Por disciplina</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(porDisciplina).map(([k, v]) => (
            <Metrica key={k} titulo={k} dados={calcularMetrica(v)} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-foreground-muted">Por banca</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(porBanca).map(([k, v]) => (
            <Metrica key={k} titulo={k} dados={calcularMetrica(v)} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-foreground-muted">Por prova</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(porProva).map(([k, v]) => (
            <Metrica key={k} titulo={k} dados={calcularMetrica(v)} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-foreground-muted">Evolução semanal (8 últimas semanas)</h2>
        <div className="space-y-1">
          {semanas.map((s, i) => {
            const m = calcularMetrica(s.itens);
            return (
              <div key={i} className="flex items-center gap-2 text-sm">
                <span className="w-24 text-foreground-muted">{s.inicio.toLocaleDateString("pt-BR")}</span>
                <div className="h-2 flex-1 rounded bg-surface-muted">
                  {!m.amostraInsuficiente && (
                    <div className="h-2 rounded bg-accent-concursos" style={{ width: `${m.percentual}%` }} />
                  )}
                </div>
                <span className="w-28 text-right text-foreground-muted">
                  {m.amostraInsuficiente ? `n=${m.total}` : `${m.percentual}% (${m.acertos}/${m.total})`}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {(goals ?? []).length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-foreground-muted">Metas ativas</h2>
          <ul className="space-y-1 text-sm">
            {(goals ?? []).map((g) => (
              <li key={g.id}>
                {g.descricao} — alvo: {g.valor_alvo} {g.unidade} ({g.periodo})
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
