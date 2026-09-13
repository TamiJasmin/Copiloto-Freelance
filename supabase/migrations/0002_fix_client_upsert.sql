-- ============================================================
-- Arregla el 400 al dar de alta un cliente
-- ============================================================
--
-- El índice de 0001_init.sql era PARCIAL:
--
--   create unique index clients_user_wpp_uniq
--     on public.clients (user_id, whatsapp_number)
--     where whatsapp_number is not null;   <-- el problema
--
-- Postgres no puede inferir un índice parcial en un
-- "ON CONFLICT (user_id, whatsapp_number)" a menos que la sentencia
-- repita el mismo WHERE. PostgREST no lo emite, así que el upsert de
-- supabase-js fallaba con 42P10 -> HTTP 400.
--
-- El WHERE nunca hizo falta: en Postgres los NULL son distintos entre sí
-- dentro de un índice único (NULLS DISTINCT, el comportamiento por
-- defecto), así que un índice total sigue permitiendo muchos clientes
-- sin teléfono cargado.

drop index if exists public.clients_user_wpp_uniq;

create unique index if not exists clients_user_wpp_uniq
  on public.clients (user_id, whatsapp_number);
