import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { errorMessage } from '@/lib/errors';
import type { ClientOverview } from '@/types/db';

/**
 * Estado con el que se filtra la agenda.
 *
 * "moroso" y "sin_actividad" no están guardados en `clients.status`: salen
 * de los presupuestos del cliente. Un cliente no es moroso por decisión de
 * nadie, lo es porque debe plata hace rato — y eso cambia solo con el
 * tiempo, así que se calcula en vez de guardarse.
 */
export type FiltroCliente = 'todos' | 'activo' | 'moroso' | 'prospecto' | 'sin_actividad';

export const FILTROS_CLIENTE: { value: FiltroCliente; label: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'activo', label: 'Activos' },
  { value: 'moroso', label: 'Morosos' },
  { value: 'prospecto', label: 'Prospectos' },
  { value: 'sin_actividad', label: 'Sin actividad' },
];

const DIAS_SIN_ACTIVIDAD = 90;

const diasDesde = (iso: string | null): number =>
  iso === null ? Infinity : Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);

/** Etiqueta derivada de un cliente, por orden de urgencia. */
export function clienteView(c: ClientOverview): Exclude<FiltroCliente, 'todos'> {
  if (c.morosos > 0) return 'moroso';
  if (c.total_cobrado > 0 && diasDesde(c.last_quote_at) <= DIAS_SIN_ACTIVIDAD) return 'activo';
  if (c.quotes_count === 0 || c.total_cobrado === 0) return 'prospecto';
  return 'sin_actividad';
}

export function useClientsOverview() {
  const [clients, setClients] = useState<ClientOverview[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState('');
  const [filtro, setFiltro] = useState<FiltroCliente>('todos');

  const load = useCallback(async () => {
    setError(null);
    const { data, error } = await supabase
      .from('clients_overview')
      .select('*')
      .order('last_quote_at', { ascending: false, nullsFirst: false })
      .limit(500);

    if (error) setError(errorMessage(error));
    else setClients((data ?? []) as ClientOverview[]);

    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const refresh = useCallback(() => {
    setRefreshing(true);
    return load();
  }, [load]);

  const counts = useMemo(() => {
    const acc: Record<string, number> = { todos: clients.length };
    for (const c of clients) {
      const v = clienteView(c);
      acc[v] = (acc[v] ?? 0) + 1;
    }
    return acc;
  }, [clients]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return clients.filter((c) => {
      if (filtro !== 'todos' && clienteView(c) !== filtro) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        (c.whatsapp_number ?? '').includes(q.replace(/\D/g, '')) ||
        (c.email ?? '').toLowerCase().includes(q)
      );
    });
  }, [clients, query, filtro]);

  return {
    clients: visible,
    total: clients.length,
    counts,
    loading,
    refreshing,
    error,
    refresh,
    query,
    setQuery,
    filtro,
    setFiltro,
  };
}
