import { Text, View } from 'react-native';
import { STATUS_META } from '@/theme/tokens';
import type { QuoteStatus } from '@/types/db';

export function StatusPill({ status }: { status: QuoteStatus }) {
  const meta = STATUS_META[status];

  return (
    <View
      className="flex-row items-center rounded-full px-2.5 py-1"
      style={{ backgroundColor: meta.chipBg }}
    >
      <View className="mr-1.5 h-1.5 w-1.5 rounded-full" style={{ backgroundColor: meta.color }} />
      <Text className="text-micro font-bold" style={{ color: meta.color }}>
        {meta.label}
      </Text>
    </View>
  );
}
