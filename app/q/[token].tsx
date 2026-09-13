import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Platform, Pressable, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { supabase } from '@/lib/supabase';
import { money } from '@/lib/format';
import { buildQuoteHtml } from '@/services/pdf';
import { C } from '@/theme/tokens';
import type { QuoteItem, PaymentInfo } from '@/types/db';

/** Fila que devuelve el RPC público `quote_by_token`. */
type SharedQuote = {
  number: number;
  created_at: string;
  valid_until: string | null;
  items: QuoteItem[];
  total_amount: number;
  currency: string;
  notes: string | null;
  client_name: string;
  business_name: string | null;
  business_email: string;
  logo_url: string | null;
  payment_info: PaymentInfo;
};

type State =
  | { kind: 'loading' }
  | { kind: 'ready'; quote: SharedQuote }
  | { kind: 'missing' }
  | { kind: 'error'; message: string };

export default function PublicQuote() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const [state, setState] = useState<State>({ kind: 'loading' });

  useEffect(() => {
    let alive = true;

    (async () => {
      if (!token) return setState({ kind: 'missing' });

      const { data, error } = await supabase.rpc('quote_by_token', { p_token: token });
      if (!alive) return;

      if (error) return setState({ kind: 'error', message: error.message });

      const row = (data as SharedQuote[] | null)?.[0];
      setState(row ? { kind: 'ready', quote: row } : { kind: 'missing' });
    })();

    return () => {
      alive = false;
    };
  }, [token]);

  // En web el documento se entrega tal cual: mismo HTML que el PDF, dentro
  // de un iframe que ocupa la pantalla. Así lo que ve el cliente y lo que
  // se imprime son exactamente lo mismo.
  useEffect(() => {
    if (state.kind !== 'ready' || Platform.OS !== 'web') return;
    if (typeof document === 'undefined') return;
    document.title = `Presupuesto #${state.quote.number}`;
  }, [state]);

  if (state.kind === 'loading') {
    return (
      <Centered>
        <ActivityIndicator color={C.accent} />
      </Centered>
    );
  }

  if (state.kind === 'missing') {
    return (
      <Centered>
        <Ionicons name="document-outline" size={30} color={C.faint} />
        <Text className="mt-4 text-heading font-bold text-ink">Presupuesto no disponible</Text>
        <Text className="mt-2 max-w-[320px] text-center text-label text-muted">
          El link puede haber cambiado o el presupuesto ya no está compartido. Pedile uno nuevo a
          quien te lo envió.
        </Text>
      </Centered>
    );
  }

  if (state.kind === 'error') {
    return (
      <Centered>
        <Text className="text-heading font-bold" style={{ color: C.danger }}>
          No pudimos cargarlo
        </Text>
        <Text className="mt-2 text-center text-label text-muted">{state.message}</Text>
      </Centered>
    );
  }

  const q = state.quote;

  if (Platform.OS === 'web') {
    const html = buildQuoteHtml(
      { ...q, client_whatsapp: null },
      {
        business_name: q.business_name,
        email: q.business_email,
        logo_url: q.logo_url,
        payment_info: q.payment_info,
      },
    );

    return (
      <iframe
        srcDoc={html}
        title={`Presupuesto #${q.number}`}
        // 100dvh sigue a la barra del navegador movil; 100vh la ignora y
        // deja el final del documento tapado.
        style={{ border: 0, width: '100%', height: '100dvh', display: 'block' }}
      />
    );
  }

  // Nativo: el link https lo abre el navegador, no la app, así que esto
  // sólo se ve si alguien navega acá desde adentro. Vista mínima y correcta.
  return (
    <View className="flex-1 bg-bg">
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-micro font-bold uppercase text-muted">Presupuesto</Text>
        <Text className="mt-1 text-display font-bold text-ink">#{q.number}</Text>
        <Text className="mt-4 text-body text-muted">{q.business_name}</Text>
        <Text className="mt-8 text-title font-bold text-accent">
          {money(q.total_amount, q.currency)}
        </Text>
        <Pressable
          onPress={() => Linking.openURL(`mailto:${q.business_email}`)}
          className="mt-8 h-[52px] items-center justify-center rounded-xl border border-border px-6"
        >
          <Text className="text-body font-semibold text-ink">Contactar</Text>
        </Pressable>
      </View>
    </View>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <View className="flex-1 items-center justify-center bg-bg px-6">{children}</View>;
}
