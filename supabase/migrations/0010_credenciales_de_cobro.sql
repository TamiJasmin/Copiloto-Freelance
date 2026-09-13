-- ============================================================
-- Credenciales de cobro del usuario
-- ============================================================
--
-- El Access Token de Mercado Pago permite cobrar y devolver plata en nombre
-- de quien lo emitió. No es un dato más del perfil: es una llave.
--
-- Por eso NO va en public.users, que la app lee entera para mostrar el
-- nombre del negocio. Va en su propia tabla, y esa tabla no tiene policy de
-- SELECT: ni el dueño puede leer su token de vuelta desde la app. Se escribe
-- y se olvida.
--
-- Consecuencia buscada: si alguien roba una sesión, se lleva los datos del
-- negocio pero no la llave para cobrar en su nombre. El único que lo lee es
-- el servidor, con service_role, dentro de la Edge Function.

create table if not exists public.user_payment_credentials (
  user_id          uuid primary key references public.users (id) on delete cascade,
  mp_access_token  text,
  updated_at       timestamptz not null default now()
);

alter table public.user_payment_credentials enable row level security;

-- Escribir lo propio, sí. Leerlo, no: no existe policy de select a propósito.
drop policy if exists credenciales_insert on public.user_payment_credentials;
create policy credenciales_insert on public.user_payment_credentials
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists credenciales_update on public.user_payment_credentials;
create policy credenciales_update on public.user_payment_credentials
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists credenciales_delete on public.user_payment_credentials;
create policy credenciales_delete on public.user_payment_credentials
  for delete to authenticated using (auth.uid() = user_id);

-- ============================================================
-- ¿Hay credencial cargada?
-- ============================================================
-- La pantalla necesita saber si mostrar "Conectado" o "Conectá tu cuenta",
-- y como no puede leer la tabla, se lo pregunta a esta función. Devuelve un
-- booleano: nunca el token.

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
