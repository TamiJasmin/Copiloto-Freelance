import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusPill } from '@/components/ui/StatusPill';
import { C } from '@/theme/tokens';
import { money, relativeDay } from '@/lib/format';
import type { QuoteWithClient } from '@/types/db';

type Props = {
  quote: QuoteWithClient;
  onPress: () => void;
  onRemind: () => void;
};

export function QuoteRow({ quote, onPress, onRemind }: Props) {
  // El recordatorio sólo tiene sentido si ya salió y hay a quién escribirle.
  const canRemind =
    (quote.status === 'enviado' || quote.status === 'aprobado') && !!quote.client_whatsapp;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Presupuesto de ${quote.client_name} por ${money(quote.total_amount, quote.currency)}`}
      className="mb-2 flex-row items-center rounded-xl border border-border bg-surface px-4 py-3.5 active:bg-elevated"
    >
      <View className="flex-1 pr-3">
        <Text className="text-body font-semibold text-ink" numberOfLines={1}>
          {quote.client_name}
        </Text>
        <View className="mt-2 flex-row items-center">
          <StatusPill status={quote.status} />
          <Text className="ml-2 text-caption text-faint">{relativeDay(quote.created_at)}</Text>
        </View>
      </View>

      <Text
        className="text-body font-bold text-ink"
        style={{ fontVariant: ['tabular-nums'] }}
        numberOfLines={1}
      >
        {money(quote.total_amount, quote.currency, true)}
      </Text>

      {canRemind ? (
        <Pressable
          onPress={onRemind}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={`Recordar pago a ${quote.client_name} por WhatsApp`}
          className="ml-3 h-9 w-9 items-center justify-center rounded-full bg-elevated active:opacity-70"
        >
          <Ionicons name="logo-whatsapp" size={17} color={C.sent} />
        </Pressable>
      ) : (
        <Ionicons name="chevron-forward" size={17} color={C.faint} style={{ marginLeft: 12 }} />
      )}
    </Pressable>
  );
}
