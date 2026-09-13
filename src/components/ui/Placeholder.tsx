import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Button } from '@/components/ui/Button';

/** Pantalla en construcción — mantiene la navegación viva mientras se implementa. */
export function Placeholder({ title, hint }: { title: string; hint: string }) {
  const router = useRouter();
  return (
    <View className="flex-1 bg-bg">
      <SafeAreaView className="flex-1 justify-center px-6">
        <Text className="text-[24px] font-bold tracking-tight text-ink">{title}</Text>
        <Text className="mb-8 mt-2 text-[14px] leading-6 text-muted">{hint}</Text>
        <Button label="Volver" variant="ghost" onPress={() => router.back()} />
      </SafeAreaView>
    </View>
  );
}
