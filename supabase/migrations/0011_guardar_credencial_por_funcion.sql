-- ============================================================
-- La credencial se guarda por función, no por escritura directa
-- ============================================================
--
-- 0010 dejaba escribir la tabla desde la app con policies de RLS y sin
-- policy de SELECT. La idea era buena —que el token no se pueda leer de
-- vuelta— pero la implementación era frágil: guardar terminaba en
-- "new row violates row-level security policy" (42501).
--
-- El arreglo no es depurar esas policies sino sacarlas. La tabla queda con
-- RLS activa y CERO policies, o sea completamente inaccesible desde la API:
-- ni leer, ni escribir, ni borrar. Nadie la toca directo.
--
-- Para escribir hay una única puerta, esta función, que decide por sí misma
-- de quién es la fila en vez de confiar en lo que mande el cliente. Es más
-- simple de auditar: la pregunta "¿quién puede tocar esto?" se contesta
-- leyendo una función, no cruzando tres policies.

-- ---------- 1. Cerrar la tabla ----------
drop policy if exists credenciales_insert on public.user_payment_credentials;
drop policy if exists credenciales_update on public.user_payment_credentials;
drop policy if exists credenciales_delete on public.user_payment_credentials;

alter table public.user_payment_credentials enable row level security;

-- ---------- 2. La única puerta de escritura ----------
create or replace function public.guardar_credencial_mp(p_token text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Hace falta una sesión activa.';
  end if;

  -- El user_id sale de la sesión, NO de lo que mande el cliente: así nadie
  -- puede guardar un token en la cuenta de otro.
  insert into public.user_payment_credentials (user_id, mp_access_token, updated_at)
  values (auth.uid(), nullif(btrim(p_token), ''), now())
  on conflict (user_id) do update
    set mp_access_token = excluded.mp_access_token,
        updated_at      = now();
end $$;

revoke all on function public.guardar_credencial_mp(text) from public;
grant execute on function public.guardar_credencial_mp(text) to authenticated;

-- ---------- 3. Consulta de estado ----------
-- Devuelve un booleano, nunca el token. Es lo que permite que la pantalla
-- muestre "Conectado" sin poder leer la credencial.
create or replace function public.tiene_credencial_mp()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_payment_credentials
    where user_id = auth.uid()
      and coalesce(mp_access_token, '') <> ''
  );
$$;

revoke all on function public.tiene_credencial_mp() from public;
grant execute on function public.tiene_credencial_mp() to authenticated;

-- ============================================================
-- Verificación
-- ============================================================
--
--   select count(*) as policies_que_deberian_ser_cero
--   from pg_policies
--   where tablename = 'user_payment_credentials';
--
--   select proname from pg_proc
--   where proname in ('guardar_credencial_mp', 'tiene_credencial_mp');
