import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ClientPicker, type ClientDraft } from '@/components/quote/ClientPicker';
import {
  ItemsEditor,
  emptyItem,
  itemsTotal,
  parseAmount,
  type ItemDraft,
} from '@/components/quote/ItemsEditor';
import { Button } from '@/components/ui/Button';
import { Screen, ScreenHeader } from '@/components/ui/Screen';
import { useClients } from '@/hooks/useClients';
import { useSession } from '@/hooks/useSession';
import { supabase } from '@/lib/supabase';
import { createQuote } from '@/services/quotes';
import { quoteShareUrl } from '@/lib/share';
import { quoteMessage, reserveWhatsAppWindow } from '@/services/whatsapp';
import { friendlyError } from '@/lib/errors';
import { C } from '@/theme/tokens';

type Errors = { client?: string | null; items?: string | null };

export default function NewQuote() {
  const router = useRouter();
  const { session, profile } = useSession();
  const { clients, createClient } = useClients();

  const [client, setClient] = useState<ClientDraft>({ id: null, name: '', whatsapp: '' });
  const [items, setItems] = useState<ItemDraft[]>([emptyItem()]);
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState<'send' | 'draft' | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  const currency = profile?.currency ?? 'ARS';
  const total = itemsTotal(items);

  const validate = (): boolean => {
    const next: Errors = {};
    if (!client.id && client.name.trim().length < 2) {
      next.client = 'Elegí un cliente o escribí un nombre';
    }
    if (total <= 0) next.items = 'Cargá al menos un ítem con monto';
    setErrors(next);
    return !next.client && !next.items;
  };

  const submit = async (mode: 'send' | 'draft') => {
    if (!validate()) return;
    if (!session?.user) return setFailure('Tu sesión expiró, volvé a entrar.');
    if (mode === 'send' && !profile) {
      return setFailure('Todavía estamos cargando los datos de tu negocio.');
    }

    // La ventana se reserva ACA, dentro del gesto del clic. Si se abriera
    // despues de guardar, el navegador la bloquearia por no ser solicitada.
    const abrirWhatsApp = mode === 'send' ? reserveWhatsAppWindow() : null;

    setBusy(mode);
    setFailure(null);

    try {
      // Cliente nuevo: se da de alta recién acá, no mientras tipea.
      const clientId = client.id ?? (await createClient(client.name, client.whatsapp)).id;

      const quote = await createQuote({
        userId: session.user.id,
        clientId,
        currency,
        total,
        items: items
          .filter((i) => parseAmount(i.amount) > 0)
          .map((i) => ({
            description: i.description.trim() || 'Servicio',
            amount: parseAmount(i.amount),
          })),
      });

      if (abrirWhatsApp) {
        // quoteShareUrl falla si falta el token, y el catch muestra por que.
        const link = quoteShareUrl(quote.share_token);
        abrirWhatsApp(quote.client_whatsapp, quoteMessage(quote, link));
        void supabase.from('quotes').update({ status: 'enviado' }).eq('id', quote.id);
      }

      // Al detalle, no atras: ahi se ve el presupuesto y se puede reenviar.
      router.replace(`/quote/${quote.id}`);
    } catch (e) {
      // El objeto completo a la consola; el texto util, a la pantalla.
      console.error('[presupuesto]', e);
      setFailure(friendlyError(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Screen
        header={
          <ScreenHeader
            title="Nuevo Presupuesto"
            action={
              <Pressable
                onPress={() => router.back()}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Cerrar"
                className="h-10 w-10 items-center justify-center rounded-full bg-surface active:opacity-70"
              >
                <Ionicons name="close" size={19} color={C.muted} />
              </Pressable>
            }
          />
        }
        footer={
          <>
            <Button
              label="Enviar por WhatsApp"
              icon="logo-whatsapp"
              loading={busy === 'send'}
              disabled={busy !== null}
              onPress={() => submit('send')}
            />
            <Pressable
              onPress={() => submit('draft')}
              disabled={busy !== null}
              hitSlop={8}
              accessibilityRole="button"
              className="mt-3.5 items-center active:opacity-60"
            >
              <Text className="text-label font-semibold text-muted">
                {busy === 'draft' ? 'Guardando…' : 'Guardar como borrador'}
              </Text>
            </Pressable>
          </>
        }
      >
        <ClientPicker
          clients={clients}
          value={client}
          onChange={(c) => {
            setClient(c);
            if (errors.client) setErrors((e) => ({ ...e, client: null }));
          }}
          error={errors.client}
        />

        <View className="mt-7">
          <ItemsEditor
            items={items}
            onChange={(i) => {
              setItems(i);
              if (errors.items) setErrors((e) => ({ ...e, items: null }));
            }}
            currency={currency}
            error={errors.items}
          />
        </View>

        {failure ? (
          <View className="mt-5 rounded-xl border border-border bg-surface px-4 py-3">
            <Text className="text-label leading-5" style={{ color: C.danger }}>
              {failure}
            </Text>
          </View>
        ) : null}
      </Screen>
    </KeyboardAvoidingView>
  );
}
