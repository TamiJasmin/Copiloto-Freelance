import { ActivityIndicator, Linking, Pressable, RefreshControl, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { FilterChips } from '@/components/ui/FilterChips';
import { SearchBar } from '@/components/ui/SearchBar';
import { Screen, ScreenHeader } from '@/components/ui/Screen';
import {
  clienteView,
  FILTROS_CLIENTE,
  useClientsOverview,
  type FiltroCliente,
} from '@/hooks/useClientsOverview';
import { useSession } from '@/hooks/useSession';
import { money, relativeDay } from '@/lib/format';
import { C } from '@/theme/tokens';
import type { ClientOverview } from '@/types/db';

const ETIQUETA: Record<Exclude<FiltroCliente, 'todos'>, { label: string; color: string }> = {
  activo: { label: 'Activo', color: C.paid },
  moroso: { label: 'Moroso', color: C.danger },
  prospecto: { label: 'Prospecto', color: C.sent },
  sin_actividad: { label: 'Sin actividad', color: C.faint },
};

export default function Clients() {
  const router = useRouter();
  const { profile } = useSession();
  const currency = profile?.currency ?? 'ARS';
  const {
    clients,
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
  } = useClientsOverview();

  return (
    <Screen
      header={
        <ScreenHeader
          overline={`${total} en la agenda`}
          title="Clientes"
          action={
            <Pressable
              onPress={() => router.back()}
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
      <SearchBar value={query} onChange={setQuery} placeholder="Buscar por nombre o teléfono" />

      <View className="mb-4 mt-3">
        <FilterChips
          options={FILTROS_CLIENTE.map((f) => ({ ...f, count: counts[f.value] ?? 0 }))}
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
            No pudimos cargar la agenda
          </Text>
          <Text className="mt-1 text-label text-muted">{error}</Text>
        </View>
      ) : clients.length === 0 ? (
        <View className="items-center rounded-2xl border border-dashed border-border px-6 py-10">
          <Ionicons name="people-outline" size={22} color={C.faint} />
          <Text className="mt-3 text-body font-semibold text-ink">
            {total === 0 ? 'Todavía no hay clientes' : 'Nada con esos criterios'}
          </Text>
          <Text className="mt-1 text-center text-label text-muted">
            {total === 0
              ? 'Se agregan solos al crear un presupuesto.'
              : 'Probá con otro filtro o borrá la búsqueda.'}
          </Text>
        </View>
      ) : (
        clients.map((c) => <ClientRow key={c.id} client={c} currency={currency} />)
      )}
    </Screen>
  );
}

function ClientRow({ client, currency }: { client: ClientOverview; currency: string }) {
  const view = clienteView(client);
  const etiqueta = ETIQUETA[view];

  const escribir = () => {
    if (client.whatsapp_number) Linking.openURL(`https://wa.me/${client.whatsapp_number}`);
  };

  return (
    <View className="mb-2 rounded-xl border border-border bg-surface px-4 py-3.5">
      <View className="flex-row items-center">
        <View className="h-9 w-9 items-center justify-center rounded-full bg-elevated">
          <Text className="text-label font-bold text-muted">
            {client.name.trim().charAt(0).toUpperCase()}
          </Text>
        </View>

        <View className="ml-3 flex-1">
          <Text className="text-body font-semibold text-ink" numberOfLines={1}>
            {client.name}
          </Text>
          <View className="mt-1 flex-row items-center">
            <View className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: etiqueta.color }} />
            <Text className="ml-1.5 text-caption" style={{ color: etiqueta.color }}>
              {etiqueta.label}
            </Text>
            <Text className="ml-2 text-caption text-faint">
              {client.quotes_count} {client.quotes_count === 1 ? 'presupuesto' : 'presupuestos'}
              {client.last_quote_at ? ` · ${relativeDay(client.last_quote_at)}` : ''}
            </Text>
          </View>
        </View>

        {client.whatsapp_number ? (
          <Pressable
            onPress={escribir}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={`Escribir a ${client.name} por WhatsApp`}
            className="ml-2 h-9 w-9 items-center justify-center rounded-full bg-elevated active:opacity-70"
          >
            <Ionicons name="logo-whatsapp" size={17} color={C.muted} />
          </Pressable>
        ) : null}
      </View>

      {/* Los dos números que importan de un cliente: lo que ya dejó y lo que debe. */}
      {client.total_cobrado > 0 || client.total_pendiente > 0 ? (
        <View className="mt-3 flex-row border-t border-border pt-3">
          <View className="flex-1">
            <Text className="text-micro font-bold uppercase text-faint">Cobrado</Text>
            <Text
              className="mt-0.5 text-label font-bold text-ink"
              style={{ fontVariant: ['tabular-nums'] }}
            >
              {money(client.total_cobrado, currency, true)}
            </Text>
          </View>
          <View className="flex-1">
            <Text className="text-micro font-bold uppercase text-faint">Pendiente</Text>
            <Text
              className="mt-0.5 text-label font-bold"
              style={{
                color: client.morosos > 0 ? C.danger : C.ink,
                fontVariant: ['tabular-nums'],
              }}
            >
              {money(client.total_pendiente, currency, true)}
            </Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}
