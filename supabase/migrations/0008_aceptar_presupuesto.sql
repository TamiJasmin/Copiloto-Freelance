-- ============================================================
-- El cliente acepta el presupuesto desde su link
-- ============================================================
--
-- Hasta ahora el estado "aprobado" dependía de que el freelance preguntara
-- y lo cargara a mano. El cliente ya tiene el presupuesto abierto: es el
-- momento en que decide, y es donde tiene que poder decirlo.
--
-- Quien tiene el link puede aceptar. Ese es el modelo: el token (uuid v4,
-- no adivinable) ES la credencial, igual que para ver el presupuesto. No se
-- pide cuenta al cliente porque exigirle registrarse para aceptar es
-- exactamente la fricción que este producto trata de sacar.
--
-- La función es la única puerta: no se abre la tabla a anon.

create or replace function public.accept_quote(p_token uuid)
returns quote_status
language plpgsql
security definer
set search_path = public
as $$
declare
  resultado quote_status;
begin
  -- Sólo avanza desde 'enviado'. Así aceptar dos veces no hace nada, y un
  -- presupuesto cobrado o anulado no puede volver atrás.
  update public.quotes
     set status = 'aprobado'
   where share_token = p_token
     and status::text = 'enviado'
  returning status into resultado;

  if resultado is null then
    -- No avanzó: o el token no existe, o ya estaba en otro estado.
    select status into resultado
    from public.quotes
    where share_token = p_token;
  end if;

  return resultado;  -- null si el token no existe
end $$;

revoke all on function public.accept_quote(uuid) from public;
grant execute on function public.accept_quote(uuid) to anon, authenticated;

-- approved_at lo sella el trigger quotes_stamp_status, que ya corre en
-- "before update of status". Es la fecha desde la que se cuenta la mora.
