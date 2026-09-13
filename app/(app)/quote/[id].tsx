import { useState } from 'react';
import { ActivityIndicator, Linking, Platform, Pressable, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { cerrar } from '@/lib/nav';
import { Ionicons } from '@expo/vector-icons';

import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Screen, ScreenHeader } from '@/components/ui/Screen';
import { StatusPill } from '@/components/ui/StatusPill';
import { useQuote } from '@/hooks/useQuotes';
import { useSession } from '@/hooks/useSession';
import { deleteQuote, remindQuote, sendQuote, updateQuoteStatus } from '@/services/quotes';
import { quoteShareUrl } from '@/lib/share';
import { money, relativeDay } from '@/lib/format';
import { friendlyError } from '@/lib/errors';
import { ACCION_ESTADO, quoteView, siguientesEstados, VIEW_META } from '@/lib/quoteState';
import { C } from '@/theme/tokens';
import type { QuoteStatus } from '@/types/db';

export default function QuoteDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { profile } = useSession();
  const { quote, loading, error, reload } = useQuote(id);

  const [busy, setBusy] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  if (loading) {
    return (
      <Screen scroll={false} center>
        <ActivityIndicator color={C.accent} />
      </Screen>
    );
  }

  if (!quote) {
    return (
      <Screen scroll={false} center>
        <View className="items-center">
          <Ionicons name="document-outline" size={28} color={C.faint} />
          <Text className="mt-3 text-heading font-bold text-ink">No lo encontramos</Text>
          <Text className="mt-1.5 text-center text-label text-muted">
            {error ?? 'Puede haber sido eliminado.'}
          </Text>
          <View className="mt-6 w-full">
            <Button label="Volver" variant="ghost" onPress={() => cerrar()} />
          </View>
        </View>
      </Screen>
    );
  }

  const view = quoteView(quote);
  const meta = VIEW_META[view];
  const cerrado = ['cobrado', 'rechazado', 'anulado'].includes(view);

  const run = async (fn: () => Promise<void> | void) => {
    setBusy(true);
    setActionError(null);
    try {
      await fn();
      await reload();
    } catch (e) {
      console.error('[presupuesto]', e);
      setActionError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  };

  // Sin await por delante: el navegador bloquea toda ventana que no salga
  // directamente del clic.
  const enviar = () => {
    try {
      // No se espera antes de abrir: la ventana sale en el gesto. Lo que
      // sigue (grabar el estado) si se espera, para poder avisar si falla.
      sendQuote(quote)
        .then(reload)
        .catch((e) => setActionError(friendlyError(e)));
    } catch (e) {
      setActionError(friendlyError(e));
    }
  };

  const verPresupuesto = () => {
    if (!quote.share_token) {
      return setActionError('Falta correr la migración 0003 en Supabase para generar el link.');
    }
    Linking.openURL(quoteShareUrl(quote.share_token));
  };

  const cambiarEstado = (status: QuoteStatus) => run(() => updateQuoteStatus(quote.id, status));

  const eliminar = () =>
    run(async () => {
      await deleteQuote(quote.id);
      setConfirmando(false);
      cerrar();
    });

  return (
    <Screen
      header={
        <ScreenHeader
          overline={`Presupuesto #${quote.number}`}
          title={quote.client_name}
          action={
            <Pressable
              onPress={() => cerrar()}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Volver"
              className="h-10 w-10 items-center justify-center rounded-full bg-surface active:opacity-70"
            >
              <Ionicons name="close" size={19} color={C.muted} />
            </Pressable>
          }
        />
      }
      footer={
        cerrado ? (
          <Button label="Ver presupuesto" icon="open-outline" variant="ghost" onPress={verPresupuesto} />
        ) : (
          <>
            <Button
              label={quote.status === 'borrador' ? 'Enviar por WhatsApp' : 'Recordar por WhatsApp'}
              icon="logo-whatsapp"
              disabled={busy}
              onPress={quote.status === 'borrador' ? enviar : () => remindQuote(quote, profile)}
            />
            <Pressable
              onPress={verPresupuesto}
              hitSlop={8}
              accessibilityRole="button"
              className="mt-3.5 items-center active:opacity-60"
            >
              <Text className="text-label font-semibold text-muted">
                Ver lo que recibe el cliente
              </Text>
            </Pressable>
          </>
        )
      }
    >
      {/* ---------- Estado y qué hacer ---------- */}
      <View className="rounded-2xl border border-border bg-surface p-5">
        <View className="flex-row items-center justify-between">
          <StatusPill view={view} />
          <Text className="text-caption text-faint">{relativeDay(quote.created_at)}</Text>
        </View>

        <Text
          className="mt-3 text-display font-bold"
          style={{ color: view === 'cobrado' ? C.accent : C.ink, fontVariant: ['tabular-nums'] }}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {money(quote.total_amount, quote.currency)}
        </Text>

        {meta.accion ? (
          <Text className="mt-2 text-label" style={{ color: meta.color }}>
            {meta.accion}
          </Text>
        ) : null}

        {quote.valid_until ? (
          <Text className="mt-1 text-caption text-faint">
            Válido hasta el{' '}
            {new Date(`${quote.valid_until}T12:00:00`).toLocaleDateString('es-AR', {
              day: 'numeric',
              month: 'long',
            })}
          </Text>
        ) : null}
      </View>

      {/* ---------- Ítems ---------- */}
      <View className="mt-7">
        <Text className="mb-2.5 text-micro font-bold uppercase text-muted">Detalle</Text>
        <View className="overflow-hidden rounded-xl border border-border bg-surface">
          {quote.items.map((item, i) => (
            <View
              key={`${item.description}-${i}`}
              className={[
                'flex-row items-center justify-between px-4 py-3.5',
                i > 0 ? 'border-t border-border' : '',
              ].join(' ')}
            >
              <Text className="flex-1 pr-3 text-body text-ink">
                {item.description}
                {item.qty && item.qty > 1 ? (
                  <Text className="text-muted"> × {item.qty}</Text>
                ) : null}
              </Text>
              <Text
                className="text-body font-semibold text-ink"
                style={{ fontVariant: ['tabular-nums'] }}
              >
                {money(item.amount * (item.qty ?? 1), quote.currency)}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* ---------- Contacto ---------- */}
      {quote.client_whatsapp ? (
        <Pressable
          onPress={() => Linking.openURL(`https://wa.me/${quote.client_whatsapp}`)}
          accessibilityRole="button"
          className="mt-3 flex-row items-center rounded-xl border border-border bg-surface px-4 py-3.5 hover:bg-elevated active:bg-elevated"
        >
          <Ionicons name="logo-whatsapp" size={17} color={C.muted} />
          <Text className="ml-2.5 flex-1 text-body text-ink">+{quote.client_whatsapp}</Text>
          <Ionicons name="open-outline" size={16} color={C.faint} />
        </Pressable>
      ) : null}

      {/* ---------- Editar ---------- */}
      {!cerrado ? (
        <Pressable
          onPress={() => router.push(`/edit/${quote.id}`)}
          accessibilityRole="button"
          className="mt-3 flex-row items-center rounded-xl border border-border bg-surface px-4 py-3.5 hover:bg-elevated active:bg-elevated"
        >
          <Ionicons name="create-outline" size={17} color={C.muted} />
          <Text className="ml-2.5 flex-1 text-body text-ink">Editar ítems y vencimiento</Text>
          <Ionicons name="chevron-forward" size={16} color={C.faint} />
        </Pressable>
      ) : null}

      {/* ---------- Plantilla ----------
          Va también en los cerrados: un presupuesto cobrado es la mejor
          plantilla que existe, porque es trabajo que ya alguien aceptó. */}
      <Pressable
        onPress={() => router.push(`/quote/new?from=${quote.id}`)}
        accessibilityRole="button"
        className="mt-2 flex-row items-center rounded-xl border border-border bg-surface px-4 py-3.5 hover:bg-elevated active:bg-elevated"
      >
        <Ionicons name="copy-outline" size={17} color={C.muted} />
        <View className="ml-2.5 flex-1">
          <Text className="text-body text-ink">Usar como plantilla</Text>
          <Text className="mt-0.5 text-caption text-faint">
            Crea uno nuevo con estos ítems. Podés cambiar el cliente.
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={C.faint} />
      </Pressable>

      {/* ---------- Cambio de estado ---------- */}
      <View className="mt-7">
        <Text className="mb-2.5 text-micro font-bold uppercase text-muted">Qué pasó</Text>

        {siguientesEstados(quote.status).length === 0 ? (
          <Text className="text-label text-faint">
            Este presupuesto ya está cerrado. No hay más pasos.
          </Text>
        ) : (
          siguientesEstados(quote.status).map((s) => (
            <Pressable
              key={s}
              onPress={() => cambiarEstado(s)}
              disabled={busy}
              accessibilityRole="button"
              className="mb-2 flex-row items-center rounded-xl border border-border bg-surface px-4 py-3.5 hover:bg-elevated active:bg-elevated"
            >
              <Ionicons
                name={s === 'cobrado' ? 'checkmark-circle' : 'arrow-forward-circle-outline'}
                size={18}
                color={s === 'cobrado' ? C.accent : C.muted}
              />
              <Text
                className="ml-2.5 flex-1 text-body font-semibold"
                style={{ color: s === 'cobrado' ? C.accent : C.ink }}
              >
                {ACCION_ESTADO[s]}
              </Text>
            </Pressable>
          ))
        )}
      </View>

      {actionError ? (
        <View className="mt-4 rounded-xl border border-border bg-surface px-4 py-3">
          <Text className="text-label leading-5" style={{ color: C.danger }}>
            {actionError}
          </Text>
        </View>
      ) : null}

      <ConfirmDialog
        visible={confirmando}
        title={`¿Eliminar el presupuesto #${quote.number}?`}
        message={
          `Se borra para siempre, junto con su link. Si ${quote.client_name} ya lo recibió, ` +
          `el link le va a dejar de abrir. Para sacarlo de tus pendientes sin romper nada, anulalo.`
        }
        confirmLabel="Eliminar"
        destructive
        busy={busy}
        onConfirm={eliminar}
        onCancel={() => setConfirmando(false)}
      />

      {/* ---------- Eliminar ---------- */}
      <View className="mt-9 border-t border-border pt-5">
        <Pressable
          onPress={() => setConfirmando(true)}
          disabled={busy}
          hitSlop={8}
          accessibilityRole="button"
          className="self-start active:opacity-60"
        >
          <Text className="text-label font-bold" style={{ color: C.danger }}>
            Eliminar presupuesto
          </Text>
        </Pressable>
        <Text className="mt-1.5 text-caption text-faint">
          Si sólo querés sacarlo de tus pendientes, usá &quot;Anular&quot;: eliminar no se puede
          deshacer{Platform.OS === 'web' ? '' : ''}.
        </Text>
      </View>
    </Screen>
  );
}
