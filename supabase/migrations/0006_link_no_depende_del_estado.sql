-- ============================================================
-- El link público deja de depender del estado del presupuesto
-- ============================================================
--
-- 0003 filtraba los borradores: "un borrador todavía no se decidió mandar".
-- Suena razonable y estaba mal.
--
-- El estado se graba en una llamada aparte de la que abre WhatsApp, así que
-- si esa llamada falla o llega tarde, el mensaje ya salió con un link que no
-- abre nada — y el cliente ve "Presupuesto no disponible" sin que nadie se
-- entere. Compartir el link ES la decisión de mandarlo; el estado guardado
-- es sólo un reflejo de eso, y no debería poder invalidarlo.
--
-- Queda un único caso en que el link se corta: 'anulado', que es la forma
-- explícita de dar de baja un presupuesto.

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
    and q.status::text <> 'anulado';
$$;

revoke all on function public.quote_by_token(uuid) from public;
grant execute on function public.quote_by_token(uuid) to anon, authenticated;

-- ============================================================
-- Diagnóstico, por si algún link sigue sin abrir
-- ============================================================
--
--   select number, status, share_token
--   from public.quotes
--   order by created_at desc
--   limit 5;
--
-- El share_token de la URL tiene que estar en esa lista. Si está y el
-- estado es 'anulado', el corte es intencional.
