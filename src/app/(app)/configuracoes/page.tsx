import { getCurrentProfile } from "@/lib/data/profile";
import { createClient } from "@/lib/supabase/server";
import { INTERVALOS_PADRAO_DIAS } from "@/lib/domain/spacedRepetition";
import { ConfiguracoesClient } from "./ConfiguracoesClient";

export default async function ConfiguracoesPage() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();

  const { data: fontes } = await supabase
    .from("fontes")
    .select("*")
    .eq("area", profile.area)
    .order("criado_em", { ascending: false });

  const { data: consent } = await supabase
    .from("shared_dashboard_consent")
    .select("*")
    .eq("profile_id", profile.id)
    .maybeSingle();

  const { data: configIntervalos } = await supabase
    .from("settings")
    .select("valor")
    .eq("profile_id", profile.id)
    .eq("chave", "intervalos_revisao")
    .maybeSingle();

  const { data: configLimite } = await supabase
    .from("settings")
    .select("valor")
    .eq("profile_id", profile.id)
    .eq("chave", "limite_ia_usd_mensal")
    .maybeSingle();

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Configurações</h1>
      <ConfiguracoesClient
        fontes={fontes ?? []}
        painelConjuntoAtivo={consent?.opt_in ?? false}
        intervalosAtuais={
          Array.isArray(configIntervalos?.valor) ? (configIntervalos!.valor as number[]) : INTERVALOS_PADRAO_DIAS
        }
        limiteIaAtual={typeof configLimite?.valor === "number" ? (configLimite!.valor as number) : 0}
      />
    </div>
  );
}
