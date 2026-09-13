import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Platform, Pressable, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { supabase } from '@/lib/supabase';
import { money } from '@/lib/format';
import { errorMessage } from '@/lib/errors';
import { buildQuoteHtml } from '@/services/pdf';
import { C } from '@/theme/tokens';
import type { QuoteItem, PaymentInfo, QuoteStatus } from '@/types/db';

/** Fila que devuelve el RPC público `quote_by_token`. */
type SharedQuote = {
  number: number;
  created_at: string;
  valid_until: string | null;
  items: QuoteItem[];
  total_amount: number;
  currency: string;
  notes: string | null;
  status: QuoteStatus;
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

  const [confirmando, setConfirmando] = useState(false);
  const [aceptando, setAceptando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

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

  useEffect(() => {
    if (state.kind !== 'ready' || typeof document === 'undefined') return;
    document.title = `Presupuesto #${state.quote.number}`;
  }, [state]);

  const aceptar = async () => {
    setAceptando(true);
    setAviso(null);

    const { data, error } = await supabase.rpc('accept_quote', { p_token: token });

    setAceptando(false);
    setConfirmando(false);

    if (error) return setAviso(errorMessage(error));

    // La función devuelve el estado en que quedó, haya avanzado o no: si
    // alguien ya lo había aceptado, la pantalla igual queda consistente.
    const nuevo = data as QuoteStatus | null;
    if (nuevo && state.kind === 'ready') {
      setState({ kind: 'ready', quote: { ...state.quote, status: nuevo } });
    }
  };

  /** Imprime el documento del iframe, no la barra de acciones. */
  const imprimir = () => iframeRef.current?.contentWindow?.print();

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
  const aceptado = q.status === 'aprobado' || q.status === 'cobrado';
  const puedeAceptar = q.status === 'enviado';

  if (Platform.OS === 'web') {
    // El HTML va sin barra propia: las acciones se dibujan en React, afuera
    // del iframe, porque necesitan hablar con Supabase.
    const html = buildQuoteHtml(
      { ...q, client_whatsapp: null },
      {
        business_name: q.business_name,
        email: q.business_email,
        logo_url: q.logo_url,
        payment_info: q.payment_info,
      },
    );

    const boton = {
      font: '700 14px/1 inherit',
      padding: '11px 16px',
      borderRadius: 10,
      cursor: 'pointer',
    } as const;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            flexWrap: 'wrap',
            padding: '10px 14px',
            background: C.bg,
            borderBottom: `1px solid ${C.border}`,
          }}
        >
          <div style={{ flex: 1, minWidth: 130 }}>
            <div style={{ color: C.ink, fontSize: 14, fontWeight: 700 }}>
              {q.business_name ?? 'Presupuesto'}
            </div>
            <div style={{ color: C.muted, fontSize: 12 }}>
              #{q.number} · {money(q.total_amount, q.currency)}
            </div>
          </div>

          <button
            onClick={imprimir}
            style={{ ...boton, border: `1px solid ${C.border}`, background: C.surface, color: C.ink }}
          >
            Descargar PDF
          </button>

          {aceptado ? (
            <div
              style={{
                ...boton,
                cursor: 'default',
                background: 'rgba(214,255,75,0.14)',
                color: C.accent,
              }}
            >
              ✓ Aceptado
            </div>
          ) : puedeAceptar ? (
            <button
              onClick={() => setConfirmando(true)}
              style={{ ...boton, border: 0, background: C.accent, color: C.bg }}
            >
              Aceptar presupuesto
            </button>
          ) : null}
        </div>

        {aviso ? (
          <div
            style={{
              padding: '10px 14px',
              background: 'rgba(255,92,92,0.1)',
              color: C.danger,
              fontSize: 13,
            }}
          >
            {aviso}
          </div>
        ) : null}

        <iframe
          ref={iframeRef}
          srcDoc={html}
          title={`Presupuesto #${q.number}`}
          style={{ border: 0, width: '100%', flex: 1, display: 'block' }}
        />

        <ConfirmDialog
          visible={confirmando}
          title="¿Aceptar este presupuesto?"
          message={
            `Le vas a confirmar a ${q.business_name ?? 'quien te lo envió'} que estás de acuerdo ` +
            `con ${money(q.total_amount, q.currency)}. Lo va a ver al instante.`
          }
          confirmLabel="Sí, acepto"
          busy={aceptando}
          onConfirm={aceptar}
          onCancel={() => setConfirmando(false)}
        />
      </div>
    );
  }

  // Nativo: el link https lo abre el navegador, no la app. Vista mínima.
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
