import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { cerrar } from '@/lib/nav';
import { Ionicons } from '@expo/vector-icons';

import { ClientPicker, type ClientDraft } from '@/components/quote/ClientPicker';
import {
  ItemsEditor,
  emptyItem,
  itemLineTotal,
  itemsTotal,
  parseAmount,
  parseQty,
  type ItemDraft,
} from '@/components/quote/ItemsEditor';
import { ValidityPicker } from '@/components/quote/ValidityPicker';
import { Button } from '@/components/ui/Button';
import { Screen, ScreenHeader } from '@/components/ui/Screen';
import { useClients } from '@/hooks/useClients';
import { useSession } from '@/hooks/useSession';
import { createQuote, updateQuote } from '@/services/quotes';
import { quoteShareUrl } from '@/lib/share';
import { quoteMessage, reserveWhatsAppWindow } from '@/services/whatsapp';
import { friendlyError } from '@/lib/errors';
import { supabase } from '@/lib/supabase';
import { C } from '@/theme/tokens';
import type { QuoteWithClient } from '@/types/db';

type Errors = { client?: string | null; items?: string | null };
type Busy = 'send' | 'draft' | null;

/** Pasa los ítems guardados al formato de edición. */
function aDrafts(quote: QuoteWithClient): ItemDraft[] {
  if (!quote.items.length) return [emptyItem()];
  return quote.items.map((i) => ({
    key: Math.random().toString(36).slice(2),
    description: i.description,
    qty: String(i.qty ?? 1),
    amount: String(i.amount),
  }));
}

type Props = {
  /** Si viene, el formulario edita en vez de crear. */
  quote?: QuoteWithClient;
};

export function QuoteForm({ quote }: Props) {
  const router = useRouter();
  const { session, profile } = useSession();
  const { clients, createClient } = useClients();

  const editando = !!quote;

  const [client, setClient] = useState<ClientDraft>(
    quote
      ? { id: quote.client_id, name: quote.client_name, whatsapp: quote.client_whatsapp ?? '' }
      : { id: null, name: '', whatsapp: '' },
  );
  const [items, setItems] = useState<ItemDraft[]>(quote ? aDrafts(quote) : [emptyItem()]);
  const [validUntil, setValidUntil] = useState<string | null>(quote?.valid_until ?? null);

  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState<Busy>(null);
  const [failure, setFailure] = useState<string | null>(null);

  const currency = profile?.currency ?? 'ARS';
  const total = itemsTotal(items);

  const validate = (): boolean => {
    const next: Errors = {};
    if (!client.id && client.name.trim().length < 2) {
      next.client = 'Elegí un cliente o escribí un nombre';
    }
    if (total <= 0) next.items = 'Cargá al menos un ítem con precio';
    setErrors(next);
    return !next.client && !next.items;
  };

  const itemsGuardables = () =>
    items
      .filter((i) => itemLineTotal(i) > 0)
      .map((i) => ({
        description: i.description.trim() || 'Servicio',
        // amount es el precio de UNA unidad; el total de la línea lo
        // reconstruyen el PDF y el detalle como amount * qty.
        amount: parseAmount(i.amount),
        qty: parseQty(i.qty),
      }));

  const submit = async (mode: 'send' | 'draft') => {
    if (!validate()) return;
    if (!session?.user) return setFailure('Tu sesión expiró, volvé a entrar.');

    // La ventana se reserva ACÁ, dentro del gesto del clic. Si se abriera
    // después de guardar, el navegador la bloquearía por no ser solicitada.
    const abrirWhatsApp = mode === 'send' ? reserveWhatsAppWindow() : null;

    setBusy(mode);
    setFailure(null);

    try {
      if (editando) {
        await updateQuote(quote.id, {
          items: itemsGuardables(),
          total_amount: total,
          valid_until: validUntil,
        });
        router.replace(`/quote/${quote.id}`);
        return;
      }

      // Cliente nuevo: se da de alta recién acá, no mientras tipea.
      const clientId = client.id ?? (await createClient(client.name, client.whatsapp)).id;

      const creada = await createQuote({
        userId: session.user.id,
        clientId,
        currency,
        total,
        items: itemsGuardables(),
        validUntil,
      });

      if (abrirWhatsApp) {
        const link = quoteShareUrl(creada.share_token);
        abrirWhatsApp(creada.client_whatsapp, quoteMessage(creada, link));

        const { error } = await supabase
          .from('quotes')
          .update({ status: 'enviado' })
          .eq('id', creada.id);
        if (error) throw error;
      }

      router.replace(`/quote/${creada.id}`);
    } catch (e) {
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
            overline={editando ? `Presupuesto #${quote.number}` : undefined}
            title={editando ? 'Editar' : 'Nuevo Presupuesto'}
            action={
              <Pressable
                onPress={() => cerrar()}
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
          editando ? (
            <Button
              label="Guardar cambios"
              icon="checkmark"
              loading={busy === 'draft'}
              disabled={busy !== null}
              onPress={() => submit('draft')}
            />
          ) : (
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
          )
        }
      >
        {editando ? (
          // Cambiar de cliente obligaría a mover el presupuesto de dueño y a
          // invalidar el link ya enviado. Se muestra, no se edita.
          <View>
            <Text className="mb-2 text-micro font-bold uppercase text-muted">Cliente</Text>
            <View className="h-[52px] flex-row items-center rounded-xl border border-border bg-surface px-4">
              <View className="h-8 w-8 items-center justify-center rounded-full bg-elevated">
                <Text className="text-label font-bold text-muted">
                  {client.name.trim().charAt(0).toUpperCase()}
                </Text>
              </View>
              <Text className="ml-3 flex-1 text-body font-semibold text-ink" numberOfLines={1}>
                {client.name}
              </Text>
            </View>
          </View>
        ) : (
          <ClientPicker
            clients={clients}
            value={client}
            onChange={(c) => {
              setClient(c);
              if (errors.client) setErrors((e) => ({ ...e, client: null }));
            }}
            error={errors.client}
          />
        )}

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

        <View className="mt-7">
          <ValidityPicker value={validUntil} onChange={setValidUntil} />
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
