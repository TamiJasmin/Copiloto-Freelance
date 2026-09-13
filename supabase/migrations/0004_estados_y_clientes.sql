-- ============================================================
-- Estados que faltaban + vista de clientes
-- ============================================================

-- Un cliente puede decir que no, y un presupuesto puede darse de baja.
-- Sin estos dos, esos casos quedaban disfrazados de "enviado" para siempre
-- e inflaban el pendiente del dashboard.
alter type quote_status add value if not exists 'rechazado';
alter type quote_status add value if not exists 'anulado';

-- Cuándo lo aprobó el cliente. Es la fecha desde la que se cuenta la mora:
-- sin esto no hay forma de saber hace cuánto que deben la plata.
alter table public.quotes
  add column if not exists approved_at timestamptz;

-- ============================================================
-- Sellado de fechas por estado
-- ============================================================
create or replace function public.stamp_quote_status()
returns trigger language plpgsql as $$
begin
  if new.status = 'enviado' and new.sent_at is null then
    new.sent_at = now();
  end if;
  if new.status = 'aprobado' and new.approved_at is null then
    new.approved_at = now();
  end if;
  if new.status = 'cobrado' then
    if new.paid_at is null then new.paid_at = now(); end if;
    -- Cobrado implica aprobado: si se saltó el paso, se sella igual para
    -- que los reportes por fecha de aprobación no queden con huecos.
    if new.approved_at is null then new.approved_at = now(); end if;
  end if;
  return new;
end $$;

drop trigger if exists quotes_stamp_status on public.quotes;
create trigger quotes_stamp_status
  before insert or update of status on public.quotes
  for each row execute function public.stamp_quote_status();

-- ============================================================
-- Vista de clientes con lo que importa de cada uno
-- ============================================================
-- Evita traer todos los presupuestos al teléfono sólo para sumar totales
-- por cliente. security_invoker mantiene la RLS de las tablas de origen.
create or replace view public.clients_overview
with (security_invoker = true) as
select
  c.*,
  count(q.id) filter (where q.status <> 'anulado')                      as quotes_count,
  coalesce(sum(q.total_amount) filter (where q.status = 'cobrado'), 0)  as total_cobrado,
  coalesce(sum(q.total_amount) filter (
    where q.status in ('enviado', 'aprobado')
  ), 0)                                                                as total_pendiente,
  count(q.id) filter (
    where q.status = 'aprobado'
      and q.approved_at < now() - interval '14 days'
  )                                                                    as morosos,
  max(q.created_at)                                                    as last_quote_at
from public.clients c
left join public.quotes q on q.client_id = c.id
group by c.id;

-- ============================================================
-- El pendiente del dashboard no debe contar lo rechazado ni lo anulado
-- ============================================================
create or replace function public.dashboard_summary(p_month date default null)
returns table (
  quoted     numeric,
  collected  numeric,
  pending    numeric,
  open_count int
)
language sql stable security invoker as $$
  with m as (
    select date_trunc('month', coalesce(p_month, current_date)) as start
  )
  select
    coalesce(sum(q.total_amount) filter (
      where q.created_at >= m.start and q.created_at < m.start + interval '1 month'
        and q.status <> 'anulado'
    ), 0) as quoted,
    coalesce(sum(q.total_amount) filter (
      where q.status = 'cobrado'
        and q.paid_at >= m.start and q.paid_at < m.start + interval '1 month'
    ), 0) as collected,
    coalesce(sum(q.total_amount) filter (
      where q.status in ('enviado', 'aprobado')
    ), 0) as pending,
    count(*) filter (
      where q.status in ('borrador', 'enviado', 'aprobado')
    )::int as open_count
  from public.quotes q, m
  where q.user_id = auth.uid();
$$;
