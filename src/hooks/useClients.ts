import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { normalizePhone } from '@/lib/format';
import type { Client } from '@/types/db';

/**
 * La agenda entera cabe en memoria: un freelance no tiene 10.000 clientes.
 * Traerla una vez permite filtrar sin ida y vuelta al servidor mientras tipea.
 */
export function useClients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false });
    setClients((data ?? []) as Client[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /** Crea el cliente, o devuelve el existente si el WhatsApp ya está en la agenda. */
  const createClient = useCallback(
    async (name: string, whatsapp: string): Promise<Client> => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error('Sesión expirada');

      const phone = whatsapp.trim() ? normalizePhone(whatsapp) : null;

      const { data, error } = await supabase
        .from('clients')
        .upsert(
          { user_id: auth.user.id, name: name.trim(), whatsapp_number: phone, status: 'activo' },
          { onConflict: 'user_id,whatsapp_number', ignoreDuplicates: false },
        )
        .select()
        .single<Client>();

      if (error) throw error;
      setClients((prev) => [data, ...prev.filter((c) => c.id !== data.id)]);
      return data;
    },
    [],
  );

  return { clients, loading, createClient, refresh: load };
}

/** Filtro local por nombre o teléfono. */
export function filterClients(clients: Client[], query: string): Client[] {
  const q = query.trim().toLowerCase();
  if (!q) return clients.slice(0, 5);
  return clients
    .filter(
      (c) =>
        c.name.toLowerCase().includes(q) || (c.whatsapp_number ?? '').includes(q.replace(/\D/g, '')),
    )
    .slice(0, 5);
}
