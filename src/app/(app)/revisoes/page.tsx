import { getCurrentProfile } from "@/lib/data/profile";
import { createClient } from "@/lib/supabase/server";
import { IniciarRevisaoButton } from "./IniciarRevisaoButton";
import { INTERVALOS_PADRAO_DIAS } from "@/lib/domain/spacedRepetition";

export default async function RevisoesPage() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();

  const hoje = new Date().toISOString().slice(0, 10);

  const { data: vencidas } = await supabase
    .from("review_queue")
    .select("*")
    .eq("profile_id", profile.id)
    .eq("status", "pendente")
    .lte("data_prevista", hoje)
    .order("data_prevista");

  const { data: futuras } = await supabase
    .from("review_queue")
    .select("*")
    .eq("profile_id", profile.id)
    .eq("status", "pendente")
    .gt("data_prevista", hoje)
    .order("data_prevista")
    .limit(20);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Revisões</h1>
        <p className="text-sm text-foreground-muted">
          Intervalos iniciais do sistema: {INTERVALOS_PADRAO_DIAS.join(", ")} dias — ajustados conforme seu desempenho.
          Configurável em Configurações.
        </p>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold">Pendentes hoje ({(vencidas ?? []).length})</h2>
        {(vencidas ?? []).length === 0 ? (
          <p className="text-sm text-foreground-muted">Nenhuma revisão pendente no momento.</p>
        ) : (
          <ul className="space-y-2">
            {(vencidas ?? []).map((r) => (
              <li key={r.id} className="flex items-center justify-between rounded-lg border border-border bg-surface p-3">
                <div>
                  <p className="text-sm font-medium">{r.assunto || r.disciplina || "Assunto geral"}</p>
                  <p className="text-xs text-foreground-muted">{r.motivo}</p>
                  <p className="text-xs text-foreground-muted">
                    Previsto para {new Date(r.data_prevista).toLocaleDateString("pt-BR")} · intervalo atual: {r.intervalo_dias} dia(s)
                  </p>
                </div>
                <IniciarRevisaoButton disciplina={r.disciplina} assunto={r.assunto} />
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold">Próximas revisões agendadas</h2>
        {(futuras ?? []).length === 0 ? (
          <p className="text-sm text-foreground-muted">Nenhuma revisão futura agendada.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {(futuras ?? []).map((r) => (
              <li key={r.id} className="flex justify-between text-foreground-muted">
                <span>{r.assunto || r.disciplina}</span>
                <span>{new Date(r.data_prevista).toLocaleDateString("pt-BR")}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
