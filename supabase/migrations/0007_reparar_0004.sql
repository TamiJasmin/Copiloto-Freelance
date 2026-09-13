-- ============================================================
-- Repara 0004, que se revertía entera
-- ============================================================
--
-- Postgres permite agregar un valor a un enum dentro de una transacción,
-- pero NO permite usarlo en esa misma transacción: tira
-- "unsafe use of new value ... of enum type" (55P04).
--
-- 0004 agregaba 'anulado' y unas líneas después lo comparaba dentro de
-- clients_overview y dashboard_summary. El editor SQL de Supabase corre
-- todo el script en una transacción, así que el error revertía el archivo
-- completo: ni las vistas, ni la columna, ni siquiera los valores del enum
-- quedaban creados. De ahí el "Could not find the table
-- public.clients_overview".
--
-- La solución es comparar contra texto (status::text = 'anulado') en vez de
-- contra el literal del enum. Así la comparación no necesita que el valor
-- exista al momento de planificar, y todo puede convivir en una corrida.
--
-- Este archivo es idempotente: se puede correr las veces que haga falta.

-- ---------- 1. Valores del enum ----------
alter type quote_status add value if not exists 'rechazado';
alter type quote_status add value if not exists 'anulado';

-- ---------- 2. Fecha de aprobación ----------
alter table public.quotes
  add column if not exists approved_at timestamptz;

-- ---------- 3. Sellado de fechas ----------
create or replace function public.stamp_quote_status()
returns trigger language plpgsql as $$
begin
  if new.status::text = 'enviado' and new.sent_at is null then
    new.sent_at = now();
  end if;
  if new.status::text = 'aprobado' and new.approved_at is null then
    new.approved_at = now();
  end if;
  if new.status::text = 'cobrado' then
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

-- ---------- 4. Vista de clientes ----------
drop view if exists public.clients_overview;

create view public.clients_overview
with (security_invoker = true) as
select
  c.*,
  count(q.id) filter (where q.status::text <> 'anulado')                       as quotes_count,
  coalesce(sum(q.total_amount) filter (where q.status::text = 'cobrado'), 0)   as total_cobrado,
  coalesce(sum(q.total_amount) filter (
    where q.status::text in ('enviado', 'aprobado')
  ), 0)                                                                       as total_pendiente,
  count(q.id) filter (
    where q.status::text = 'aprobado'
      and q.approved_at < now() - interval '14 days'
  )                                                                           as morosos,
  max(q.created_at)                                                           as last_quote_at
from public.clients c
left join public.quotes q on q.client_id = c.id
group by c.id;

-- ---------- 5. Resumen del dashboard ----------
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
        and q.status::text <> 'anulado'
    ), 0) as quoted,
    coalesce(sum(q.total_amount) filter (
      where q.status::text = 'cobrado'
        and q.paid_at >= m.start and q.paid_at < m.start + interval '1 month'
    ), 0) as collected,
    coalesce(sum(q.total_amount) filter (
      where q.status::text in ('enviado', 'aprobado')
    ), 0) as pending,
    count(*) filter (
      where q.status::text in ('borrador', 'enviado', 'aprobado')
    )::int as open_count
  from public.quotes q, m
  where q.user_id = auth.uid();
$$;

-- ---------- 6. Link público ----------
-- Se repite acá porque 0006 también compara contra 'anulado': si se corrió
-- cuando el enum estaba revertido, falló igual.
create or replace function public.quote_by_token(p_token uuid)
returns table (
  number         bigint,
  created_at     timestamptz,
  valid_until    date,
  items          jsonb,
  total_amount   numeric,
  currency       text,
  notes          text,
  status         quote_status,
  client_name    text,
  business_name  text,
  business_email text,
  logo_url       text,
  payment_info   jsonb
)
language sql stable security definer set search_path = public as $$
  select
    q.number, q.created_at, q.valid_until, q.items, q.total_amount,
    q.currency, q.notes, q.status,
    c.name,
    u.business_name, u.email, u.logo_url, u.payment_info
  from public.quotes q
  join public.clients c on c.id = q.client_id
  join public.users   u on u.id = q.user_id
  where q.share_token = p_token
    and q.status::text <> 'anulado';
$$;

revoke all on function public.quote_by_token(uuid) from public;
grant execute on function public.quote_by_token(uuid) to anon, authenticated;

-- ---------- 7. Vista de presupuestos, con todas las columnas ----------
-- "select q.*" se expande al crear la vista, así que hay que rehacerla
-- después de cada columna nueva (share_token, approved_at).
drop view if exists public.quotes_with_client;

create view public.quotes_with_client
with (security_invoker = true) as
select
  q.*,
  c.name            as client_name,
  c.whatsapp_number as client_whatsapp
from public.quotes q
join public.clients c on c.id = q.client_id;

-- ============================================================
-- Verificación: las cuatro filas tienen que aparecer
-- ============================================================
--
--   select 'clients_overview'   as objeto, to_regclass('public.clients_overview')   is not null as existe
--   union all select 'quotes_with_client', to_regclass('public.quotes_with_client') is not null
--   union all select 'approved_at',        to_regclass('public.quotes') is not null
--   union all select 'enum anulado',       'anulado' = any(enum_range(null::quote_status)::text[]);
