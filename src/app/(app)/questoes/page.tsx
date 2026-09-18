import { getCurrentProfile } from "@/lib/data/profile";
import { createClient } from "@/lib/supabase/server";
import { agruparPor } from "@/lib/domain/stats";
import { GerarQuestoesForm } from "./GerarQuestoesForm";
import { RevisarQuestaoCard } from "./RevisarQuestaoCard";

export default async function BancoDeQuestoesPage() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();

  const { data: confirmadas } = await supabase
    .from("questions")
    .select("id, disciplina, assunto, origem")
    .eq("area", profile.area)
    .eq("status", "confirmada");

  const disciplinas = Array.from(new Set((confirmadas ?? []).map((q) => q.disciplina).filter(Boolean))) as string[];
  const porDisciplina = agruparPor(confirmadas ?? [], (q) => q.disciplina);

  const { data: pendentesIa } = await supabase
    .from("questions")
    .select("*, alternatives(letra, texto, ordem), answer_keys(resposta_letra, justificativa, ativo)")
    .eq("area", profile.area)
    .eq("status", "revisao_pendente")
    .eq("origem", "ia")
    .order("criado_em", { ascending: false });

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Banco de questões</h1>

      <div>
        <h2 className="mb-2 text-sm font-semibold">Confirmadas por disciplina</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {Object.entries(porDisciplina).map(([d, qs]) => (
            <div key={d} className="rounded-lg border border-border bg-surface p-3">
              <p className="text-sm font-medium">{d}</p>
              <p className="text-xs text-foreground-muted">{qs.length} questões</p>
            </div>
          ))}
          {(confirmadas ?? []).length === 0 && (
            <p className="text-sm text-foreground-muted">Nenhuma questão confirmada ainda.</p>
          )}
        </div>
      </div>

      <GerarQuestoesForm disciplinas={disciplinas} />

      {(pendentesIa ?? []).length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-semibold">
            Questões de IA aguardando revisão ({pendentesIa!.length})
          </h2>
          <div className="space-y-3">
            {pendentesIa!.map((q) => {
              const gabaritoAtivo = (q.answer_keys as unknown as { resposta_letra: string | null; justificativa: string | null; ativo: boolean }[]).find(
                (g) => g.ativo,
              );
              const alternativas = (q.alternatives as unknown as { letra: string; texto: string; ordem: number }[])
                .sort((a, b) => a.ordem - b.ordem)
                .map((a) => ({ letra: a.letra, texto: a.texto }));
              return (
                <RevisarQuestaoCard
                  key={q.id}
                  id={q.id}
                  enunciado={q.enunciado}
                  disciplina={q.disciplina}
                  assunto={q.assunto}
                  dificuldade={q.dificuldade}
                  alternativas={alternativas}
                  respostaLetra={gabaritoAtivo?.resposta_letra ?? null}
                  justificativa={gabaritoAtivo?.justificativa ?? null}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
