-- ============================================================
-- Link de pago propio de cada presupuesto
-- ============================================================
--
-- Los datos de cobro de "Mi negocio" son un link fijo y sin monto: el
-- cliente escribe el importe y puede equivocarse. Este campo permite pegar,
-- en un presupuesto puntual, un link de Mercado Pago con el monto exacto
-- creado desde su panel.
--
-- Es además el lugar exacto donde escribiría una Edge Function el día que
-- se automatice: la pantalla no va a cambiar, sólo va a dejar de estar
-- vacío este campo.

alter table public.quotes
  add column if not exists payment_link text;

-- ============================================================
-- Rehacer la vista, otra vez
-- ============================================================
-- Postgres expande "select q.*" al CREAR la vista, así que una columna
-- nueva no aparece sola. Es el mismo problema que dejó share_token afuera
-- en 0003 y mandó links rotos a los clientes: cada columna nueva en quotes
-- obliga a rehacer esta vista.

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
-- La página pública necesita el link para poder ofrecerlo
-- ============================================================
-- Cambia la lista de columnas que devuelve, y eso "create or replace" no lo
-- permite: hay que tirar la función y volver a crearla.

drop function if exists public.quote_by_token(uuid);

create function public.quote_by_token(p_token uuid)
returns table (
  number         bigint,
  created_at     timestamptz,
  valid_until    date,
  items          jsonb,
  total_amount   numeric,
  currency       text,
  notes          text,
  status         quote_status,
  payment_link   text,
  client_name    text,
  business_name  text,
  business_email text,
  logo_url       text,
  payment_info   jsonb
)
language sql stable security definer set search_path = public as $$
  select
    q.number, q.created_at, q.valid_until, q.items, q.total_amount,
    q.currency, q.notes, q.status, q.payment_link,
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
