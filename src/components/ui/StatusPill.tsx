import { Text, View } from 'react-native';
import { VIEW_META, type QuoteView } from '@/lib/quoteState';

export function StatusPill({ view }: { view: QuoteView }) {
  const meta = VIEW_META[view];

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
