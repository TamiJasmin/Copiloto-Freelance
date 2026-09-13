import { useCallback } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { AttentionCard } from '@/components/dashboard/AttentionCard';
import { BalanceCard, MiniStat } from '@/components/dashboard/BalanceCard';
import { QuoteRow } from '@/components/dashboard/QuoteRow';
import { Button } from '@/components/ui/Button';
import { Screen, ScreenHeader } from '@/components/ui/Screen';
import { useDashboard } from '@/hooks/useDashboard';
import { useSession } from '@/hooks/useSession';
import { openWhatsApp, reminderMessage } from '@/services/whatsapp';
import { money } from '@/lib/format';
import { C } from '@/theme/tokens';
import type { QuoteWithClient } from '@/types/db';

export default function Dashboard() {
  const router = useRouter();
  const { profile } = useSession();
  const { summary, quotes, atencion, loading, refreshing, error, refresh } = useDashboard();

  const currency = profile?.currency ?? 'ARS';
  const name = profile?.business_name ?? 'Bienvenido';

  const handleRemind = useCallback(
    (quote: QuoteWithClient) =>
      openWhatsApp(quote.client_whatsapp, reminderMessage(quote, profile?.payment_info)),
    [profile?.payment_info],
  );

  return (
    <Screen
      header={
        <ScreenHeader
          overline="Hola,"
          title={name}
          action={
            <View className="flex-row items-center gap-2">
            <Pressable
              onPress={() => router.push('/clients')}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Clientes"
              className="h-10 w-10 items-center justify-center rounded-full border border-border bg-surface active:opacity-70"
            >
              <Ionicons name="people-outline" size={18} color={C.muted} />
            </Pressable>
            <Pressable
              onPress={() => router.push('/settings')}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Ajustes de tu negocio"
              className="h-10 w-10 items-center justify-center rounded-full border border-border bg-surface active:opacity-70"
            >
              <Text className="text-label font-bold text-muted">
                {name.trim().charAt(0).toUpperCase()}
              </Text>
            </Pressable>
            </View>
          }
        />
      }
      footer={
        <Button label="Nuevo Presupuesto" icon="add" onPress={() => router.push('/quote/new')} />
      }
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={refresh}
          tintColor={C.muted}
          colors={[C.accent]}
          progressBackgroundColor={C.surface}
        />
      }
    >
      {loading ? (
        <View className="items-center py-24">
          <ActivityIndicator color={C.accent} />
        </View>
      ) : (
        <>
          <BalanceCard quoted={summary.quoted} collected={summary.collected} currency={currency} />

          <View className="mt-2.5 flex-row gap-2.5">
            <MiniStat
              label="Por cobrar"
              value={money(summary.pending, currency, true)}
              accent={summary.pending > 0 ? C.sent : C.ink}
            />
            <MiniStat label="Abiertos" value={String(summary.open_count)} />
          </View>

          <AttentionCard
            count={atencion.count}
            amount={atencion.amount}
            top={atencion.top}
            currency={currency}
            onPress={() => router.push('/quotes')}
          />

          <View className="mb-3 mt-8 flex-row items-center justify-between">
            <View>
              <Text className="text-heading font-bold text-ink">Pendientes</Text>
              {quotes.length > 1 ? (
                <Text className="mt-0.5 text-caption text-faint">Lo más urgente primero</Text>
              ) : null}
            </View>
            {quotes.length > 0 && (
              <Pressable onPress={() => router.push('/quotes')} hitSlop={8}>
                <Text className="text-label font-semibold text-muted">Ver todo</Text>
              </Pressable>
            )}
          </View>

          {error ? (
            <ErrorState message={error} onRetry={refresh} />
          ) : quotes.length === 0 ? (
            <EmptyState />
          ) : (
            quotes.map((q) => (
              <QuoteRow
                key={q.id}
                quote={q}
                onPress={() => router.push(`/quote/${q.id}`)}
                onRemind={() => handleRemind(q)}
              />
            ))
          )}
        </>
      )}
    </Screen>
  );
}

function EmptyState() {
  return (
    <View className="items-center rounded-2xl border border-dashed border-border px-6 py-9">
      <View className="mb-3.5 h-11 w-11 items-center justify-center rounded-full bg-surface">
        <Ionicons name="document-text-outline" size={20} color={C.faint} />
      </View>
      <Text className="text-body font-semibold text-ink">Todo al día</Text>
      <Text className="mt-1 text-center text-label text-muted">
        Creá tu primer presupuesto y mandalo{'\n'}por WhatsApp en 30 segundos.
      </Text>
    </View>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View className="rounded-2xl border border-border bg-surface px-5 py-5">
      <Text className="text-body font-semibold" style={{ color: C.danger }}>
        No pudimos cargar tus datos
      </Text>
      <Text className="mt-1 text-label text-muted">{message}</Text>
      <Pressable onPress={onRetry} hitSlop={8} className="mt-4 self-start active:opacity-60">
        <Text className="text-label font-bold text-accent">Reintentar</Text>
      </Pressable>
    </View>
  );
}
