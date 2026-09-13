import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { quoteView, VIEW_META } from '@/lib/quoteState';
import { money } from '@/lib/format';
import { C } from '@/theme/tokens';
import type { QuoteWithClient } from '@/types/db';

type Props = {
  count: number;
  amount: number;
  /** El caso más urgente, para nombrarlo en vez de dar sólo un número. */
  top: QuoteWithClient | null;
  currency?: string;
  onPress: () => void;
};

/**
 * Aparece sólo cuando hay algo que hacer.
 *
 * Un número suelto ("3 pendientes") no mueve a nadie; nombrar el caso más
 * urgente sí, porque convierte la estadística en una tarea concreta.
 */
export function AttentionCard({ count, amount, top, currency = 'ARS', onPress }: Props) {
  if (count === 0 || !top) return null;

  const meta = VIEW_META[quoteView(top)];
  const resto = count - 1;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${count} presupuestos necesitan seguimiento por ${money(amount, currency)}`}
      className="mt-2.5 flex-row items-center rounded-xl border px-4 py-3.5 active:opacity-80"
      style={{ borderColor: 'rgba(255,92,92,0.3)', backgroundColor: 'rgba(255,92,92,0.07)' }}
    >
      <Ionicons name="alert-circle" size={19} color={C.danger} />

      <View className="ml-2.5 flex-1">
        <Text className="text-label font-bold" style={{ color: C.danger }} numberOfLines={1}>
          {meta.label}: {top.client_name}
          {resto > 0 ? ` y ${resto} más` : ''}
        </Text>
        <Text className="mt-0.5 text-caption text-muted">
          {money(amount, currency, true)} necesitan seguimiento
        </Text>
      </View>

      <Ionicons name="chevron-forward" size={16} color={C.danger} />
    </Pressable>
  );
}
