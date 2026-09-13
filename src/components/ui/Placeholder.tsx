import { Text, View } from 'react-native';
import { cerrar } from '@/lib/nav';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';

/** Pantalla en construccion - mantiene la navegacion viva mientras se implementa. */
export function Placeholder({ title, hint }: { title: string; hint: string }) {
  return (
    <Screen center>
      <View className="items-center">
        <Text className="text-title font-bold text-ink">{title}</Text>
        <Text className="mb-8 mt-2 text-center text-label text-muted">{hint}</Text>
        <View className="w-full">
          <Button label="Volver" variant="ghost" onPress={() => cerrar()} />
        </View>
      </View>
    </Screen>
  );
}
