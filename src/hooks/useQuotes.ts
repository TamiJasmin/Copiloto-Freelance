import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { coincideFiltro, quoteView, type Filtro } from '@/lib/quoteState';
import { errorMessage } from '@/lib/errors';
import type { QuoteWithClient } from '@/types/db';

/**
 * Historial completo.
 *
 * El filtrado y la búsqueda se hacen en memoria a propósito: los estados
 * derivados (moroso, vencido) no existen en la base, así que no se pueden
 * pedir con un where. Para el volumen de un freelance —cientos, no
 * millones— traer todo una vez y filtrar local es más rápido y permite
 * buscar mientras se tipea sin ida y vuelta al servidor.
 */
export function useQuotes() {
  const [quotes, setQuotes] = useState<QuoteWithClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState('');
  const [filtro, setFiltro] = useState<Filtro>('todos');

  const load = useCallback(async () => {
    setError(null);
    const { data, error } = await supabase
      .from('quotes_with_client')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);

    if (error) setError(errorMessage(error));
    else setQuotes((data ?? []) as QuoteWithClient[]);

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

  /** Cuántos hay en cada filtro, para mostrarlo en los chips. */
  const counts = useMemo(() => {
    const acc: Record<string, number> = { todos: quotes.length };
    for (const q of quotes) {
      const v = quoteView(q);
      for (const f of ['borrador', 'enviado', 'aprobado', 'moroso', 'cobrado', 'cerrado'] as const) {
        if (coincideFiltro(v, f)) acc[f] = (acc[f] ?? 0) + 1;
      }
    }
    return acc;
  }, [quotes]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return quotes.filter((quote) => {
      if (!coincideFiltro(quoteView(quote), filtro)) return false;
      if (!q) return true;
      return (
        quote.client_name.toLowerCase().includes(q) ||
        String(quote.number).includes(q) ||
        (quote.title ?? '').toLowerCase().includes(q)
      );
    });
  }, [quotes, query, filtro]);

  return {
    quotes: visible,
    total: quotes.length,
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

/** Un presupuesto suelto, para la pantalla de detalle. */
export function useQuote(id: string | undefined) {
  const [quote, setQuote] = useState<QuoteWithClient | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) {
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from('quotes_with_client')
      .select('*')
      .eq('id', id)
      .maybeSingle<QuoteWithClient>();

    if (error) setError(errorMessage(error));
    else setQuote(data);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  return { quote, loading, error, reload: load };
}
