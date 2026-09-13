import { useCallback } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { BalanceCard, MiniStat } from '@/components/dashboard/BalanceCard';
import { QuoteRow } from '@/components/dashboard/QuoteRow';
import { Button } from '@/components/ui/Button';
import { useDashboard } from '@/hooks/useDashboard';
import { useSession } from '@/hooks/useSession';
import { openWhatsApp, reminderMessage } from '@/services/whatsapp';
import { money } from '@/lib/format';
import { C } from '@/theme/tokens';
import type { QuoteWithClient } from '@/types/db';

export default function Dashboard() {
  const router = useRouter();
  const { profile } = useSession();
  const { summary, quotes, loading, refreshing, error, refresh } = useDashboard();

  const currency = profile?.currency ?? 'ARS';

  const handleRemind = useCallback(
    (quote: QuoteWithClient) =>
      openWhatsApp(quote.client_whatsapp, reminderMessage(quote, profile?.payment_info)),
    [profile?.payment_info],
  );

  return (
    <View className="flex-1 bg-bg">
      <StatusBar style="light" />
      <SafeAreaView className="flex-1" edges={['top']}>
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 140 }}
          showsVerticalScrollIndicator={false}
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
          {/* ---------- Header ---------- */}
          <View className="mb-7 mt-2 flex-row items-center justify-between">
            <View className="flex-1 pr-4">
              <Text className="text-[13px] text-muted">Hola,</Text>
              <Text className="text-[22px] font-bold tracking-tight text-ink" numberOfLines={1}>
                {profile?.business_name ?? 'Bienvenido'}
              </Text>
            </View>

            <Pressable
              onPress={() => router.push('/settings')}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Ajustes"
              className="h-11 w-11 items-center justify-center rounded-full border border-border bg-surface active:opacity-70"
            >
              <Ionicons name="person-outline" size={19} color={C.ink} />
            </Pressable>
          </View>

          {loading ? (
            <View className="items-center py-24">
              <ActivityIndicator color={C.accent} />
            </View>
          ) : (
            <>
              {/* ---------- Resumen del mes ---------- */}
              <BalanceCard
                quoted={summary.quoted}
                collected={summary.collected}
                currency={currency}
              />

              <View className="mt-2.5 flex-row gap-2.5">
                <MiniStat
                  label="Por cobrar"
                  value={money(summary.pending, currency, true)}
                  accent={summary.pending > 0 ? C.sent : C.ink}
                />
                <MiniStat label="Abiertos" value={String(summary.open_count)} />
              </View>

              {/* ---------- Pendientes ---------- */}
              <View className="mb-3.5 mt-9 flex-row items-end justify-between">
                <Text className="text-[17px] font-bold tracking-tight text-ink">Pendientes</Text>
                {quotes.length > 0 && (
                  <Pressable onPress={() => router.push('/quotes')} hitSlop={8}>
                    <Text className="text-[13px] font-semibold text-muted">Ver todo</Text>
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
        </ScrollView>

        {/* ---------- CTA fijo: el camino más corto a facturar ---------- */}
        <View
          className="absolute inset-x-0 bottom-0 px-5 pb-8 pt-4"
          style={{ backgroundColor: C.bg }}
        >
          <Button
            label="Nuevo Presupuesto"
            icon="add"
            onPress={() => router.push('/quote/new')}
          />
        </View>
      </SafeAreaView>
    </View>
  );
}

function EmptyState() {
  return (
    <View className="items-center rounded-2xl border border-dashed border-border bg-surface px-6 py-12">
      <View className="mb-4 h-12 w-12 items-center justify-center rounded-full bg-elevated">
        <Ionicons name="document-text-outline" size={22} color={C.faint} />
      </View>
      <Text className="text-[15px] font-semibold text-ink">Todo al día</Text>
      <Text className="mt-1.5 text-center text-[13px] leading-5 text-muted">
        No tenés presupuestos pendientes.{'\n'}Creá uno y mandalo por WhatsApp en 30 segundos.
      </Text>
    </View>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View className="rounded-2xl border border-border bg-surface px-5 py-6">
      <Text className="text-[14px] font-semibold" style={{ color: C.danger }}>
        No pudimos cargar tus datos
      </Text>
      <Text className="mt-1.5 text-[13px] text-muted">{message}</Text>
      <Pressable onPress={onRetry} hitSlop={8} className="mt-4 self-start">
        <Text className="text-[13px] font-bold text-accent">Reintentar</Text>
      </Pressable>
    </View>
  );
}
