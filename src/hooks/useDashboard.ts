import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { DashboardSummary, QuoteWithClient } from '@/types/db';

const EMPTY: DashboardSummary = { quoted: 0, collected: 0, pending: 0, open_count: 0 };

/**
 * Una sola pasada: RPC de totales + las últimas 20 filas abiertas.
 * Dos requests en paralelo, sin traer todo el historial al teléfono.
 */
export function useDashboard() {
  const [summary, setSummary] = useState<DashboardSummary>(EMPTY);
  const [quotes, setQuotes] = useState<QuoteWithClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const [sum, list] = await Promise.all([
      supabase.rpc('dashboard_summary'),
      supabase
        .from('quotes_with_client')
        .select('*')
        .in('status', ['borrador', 'enviado', 'aprobado'])
        .order('created_at', { ascending: false })
        .limit(20),
    ]);

    if (sum.error || list.error) {
      setError(sum.error?.message ?? list.error!.message);
    } else {
      setSummary((sum.data?.[0] as DashboardSummary) ?? EMPTY);
      setQuotes((list.data ?? []) as QuoteWithClient[]);
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Refresco en vivo: si cambia un presupuesto en otro dispositivo, recalculamos.
  useEffect(() => {
    const channel = supabase
      .channel('quotes-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'quotes' }, () => load())
      .subscribe();
    return () => void supabase.removeChannel(channel);
  }, [load]);

  const refresh = useCallback(() => {
    setRefreshing(true);
    return load();
  }, [load]);

  return { summary, quotes, loading, refreshing, error, refresh };
}
