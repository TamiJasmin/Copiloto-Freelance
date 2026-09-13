import { ActivityIndicator, Pressable, RefreshControl, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { cerrar } from '@/lib/nav';
import { Ionicons } from '@expo/vector-icons';

import { QuoteRow } from '@/components/dashboard/QuoteRow';
import { FilterChips } from '@/components/ui/FilterChips';
import { SearchBar } from '@/components/ui/SearchBar';
import { Screen, ScreenHeader } from '@/components/ui/Screen';
import { useQuotes } from '@/hooks/useQuotes';
import { useSession } from '@/hooks/useSession';
import { remindQuote } from '@/services/quotes';
import { FILTROS } from '@/lib/quoteState';
import { C } from '@/theme/tokens';

export default function QuotesList() {
  const router = useRouter();
  const { profile } = useSession();
  const {
    quotes,
    total,
    counts,
    loading,
    refreshing,
    error,
    refresh,
    query,
    setQuery,
    filtro,
    setFiltro,
  } = useQuotes();

  return (
    <Screen
      header={
        <ScreenHeader
          overline={`${total} en total`}
          title="Presupuestos"
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
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={C.muted} />
      }
    >
      <SearchBar value={query} onChange={setQuery} placeholder="Buscar por cliente o número" />

      <View className="mb-4 mt-3">
        <FilterChips
          options={FILTROS.map((f) => ({ ...f, count: counts[f.value] ?? 0 }))}
          value={filtro}
          onChange={setFiltro}
        />
      </View>

      {loading ? (
        <View className="items-center py-20">
          <ActivityIndicator color={C.accent} />
        </View>
      ) : error ? (
        <View className="rounded-2xl border border-border bg-surface px-5 py-5">
          <Text className="text-body font-semibold" style={{ color: C.danger }}>
            No pudimos cargar el historial
          </Text>
          <Text className="mt-1 text-label text-muted">{error}</Text>
        </View>
      ) : quotes.length === 0 ? (
        <View className="items-center rounded-2xl border border-dashed border-border px-6 py-10">
          <Ionicons name="search-outline" size={22} color={C.faint} />
          <Text className="mt-3 text-body font-semibold text-ink">
            {total === 0 ? 'Todavía no hay presupuestos' : 'Nada con esos criterios'}
          </Text>
          <Text className="mt-1 text-center text-label text-muted">
            {total === 0
              ? 'Cuando crees el primero va a aparecer acá.'
              : 'Probá con otro filtro o borrá la búsqueda.'}
          </Text>
        </View>
      ) : (
        quotes.map((q) => (
          <QuoteRow
            key={q.id}
            quote={q}
            showNumber
            onPress={() => router.push(`/quote/${q.id}`)}
            onRemind={() => remindQuote(q, profile)}
          />
        ))
      )}
    </Screen>
  );
}
