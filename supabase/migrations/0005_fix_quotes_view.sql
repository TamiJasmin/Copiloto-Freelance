-- ============================================================
-- Rehacer quotes_with_client para que incluya las columnas nuevas
-- ============================================================
--
-- Postgres NO guarda "select q.*": lo expande a la lista de columnas que
-- existían en el momento de crear la vista. Por eso share_token (0003) y
-- approved_at (0004) quedaron fuera aunque estén en la tabla, y el link
-- del presupuesto salía como /q/undefined.
--
-- "create or replace view" tampoco alcanza: no permite cambiar la lista de
-- columnas. Hay que tirarla y volver a crearla.
--
-- Leccion para las proximas migraciones: cada vez que se agregue una
-- columna a quotes o a clients, hay que rehacer esta vista.

drop view if exists public.quotes_with_client;

create view public.quotes_with_client
with (security_invoker = true) as
select
  q.*,
  c.name            as client_name,
  c.whatsapp_number as client_whatsapp
from public.quotes q
join public.clients c on c.id = q.client_id;

-- Verificación rápida: estas dos columnas tienen que aparecer.
--
--   select column_name
--   from information_schema.columns
--   where table_name = 'quotes_with_client'
--     and column_name in ('share_token', 'approved_at');
