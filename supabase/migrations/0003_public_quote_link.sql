-- ============================================================
-- Link público del presupuesto
-- ============================================================
-- El mensaje de WhatsApp lleva un link a una página que muestra el
-- presupuesto. Para que el cliente la abra sin cuenta hace falta un
-- camino de lectura sin sesión, pero acotado a UN presupuesto.

alter table public.quotes
  add column if not exists share_token uuid not null default gen_random_uuid();

create unique index if not exists quotes_share_token_idx
  on public.quotes (share_token);

-- ============================================================
-- Lectura pública por token
-- ============================================================
-- NO se abre la tabla con una policy para anon: eso permitiría enumerar
-- todos los presupuestos. En su lugar, una función SECURITY DEFINER que
-- exige el token exacto y devuelve sólo los campos que el cliente
-- necesita ver. Sin el token (un uuid v4) no hay nada que listar.
--
-- payment_info se expone a propósito: es el CBU/alias al que el cliente
-- tiene que transferir. No se exponen ni el user_id, ni el share_token,
-- ni el teléfono del cliente, ni el pdf_url firmado.

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
language sql
stable
security definer
set search_path = public
as $$
  select
    q.number, q.created_at, q.valid_until, q.items, q.total_amount,
    q.currency, q.notes, q.status,
    c.name,
    u.business_name, u.email, u.logo_url, u.payment_info
  from public.quotes q
  join public.clients c on c.id = q.client_id
  join public.users   u on u.id = q.user_id
  where q.share_token = p_token
    -- Un borrador no se comparte: todavía no se decidió mandarlo.
    and q.status <> 'borrador';
$$;

-- Sólo los roles de la API, y sólo esta función.
revoke all on function public.quote_by_token(uuid) from public;
grant execute on function public.quote_by_token(uuid) to anon, authenticated;
