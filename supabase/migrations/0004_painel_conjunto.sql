-- Função segura para o painel conjunto: só retorna dados agregados de
-- constância (nunca notas/desempenho comparável) e apenas quando AMBOS os
-- perfis autorizaram via shared_dashboard_consent.
create or replace function painel_conjunto()
returns table (
  perfil_id uuid,
  nome_exibicao text,
  area area_estudo,
  dias_estudo_30d int,
  blocos_concluidos_30d int,
  metas_ativas int
)
language plpgsql
security definer
set search_path = public
as $$
declare
  total_opt_in int;
begin
  select count(*) into total_opt_in from shared_dashboard_consent where opt_in = true;
  if total_opt_in < 2 then
    return;
  end if;

  return query
  select
    p.id,
    p.nome_exibicao,
    p.area,
    (select count(distinct date(a.respondido_em)) from attempts a where a.profile_id = p.id and a.respondido_em > now() - interval '30 days')::int,
    (select count(*) from study_blocks b where b.profile_id = p.id and b.status = 'concluido' and b.finalizado_em > now() - interval '30 days')::int,
    (select count(*) from goals g where g.profile_id = p.id and g.ativa)::int
  from profiles p
  where p.id in (select profile_id from shared_dashboard_consent where opt_in = true);
end;
$$;

grant execute on function painel_conjunto() to authenticated;
