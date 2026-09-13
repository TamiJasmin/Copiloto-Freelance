import { ActivityIndicator, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { cerrar } from '@/lib/nav';
import { Ionicons } from '@expo/vector-icons';

import { QuoteForm } from '@/components/quote/QuoteForm';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { useQuote } from '@/hooks/useQuotes';
import { C } from '@/theme/tokens';

/** Estados en los que el presupuesto ya no se toca. */
const CERRADOS = ['cobrado', 'rechazado', 'anulado'];

export default function EditQuote() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { quote, loading, error } = useQuote(id);

  if (loading) {
    return (
      <Screen scroll={false} center>
        <ActivityIndicator color={C.accent} />
      </Screen>
    );
  }

  if (!quote) {
    return (
      <Screen scroll={false} center>
        <View className="items-center">
          <Ionicons name="document-outline" size={28} color={C.faint} />
          <Text className="mt-3 text-heading font-bold text-ink">No lo encontramos</Text>
          <Text className="mt-1.5 text-center text-label text-muted">
            {error ?? 'Puede haber sido eliminado.'}
          </Text>
          <View className="mt-6 w-full">
            <Button label="Volver" variant="ghost" onPress={() => cerrar()} />
          </View>
        </View>
      </Screen>
    );
  }

  // Un presupuesto cobrado o rechazado es un registro de lo que pasó:
  // cambiarle los montos después reescribiría la historia.
  if (CERRADOS.includes(quote.status)) {
    return (
      <Screen scroll={false} center>
        <View className="items-center">
          <Ionicons name="lock-closed-outline" size={26} color={C.faint} />
          <Text className="mt-3 text-heading font-bold text-ink">Este ya no se edita</Text>
          <Text className="mt-1.5 text-center text-label leading-5 text-muted">
            Un presupuesto cerrado es el registro de lo que pasó. Si necesitás otro parecido,
            usalo como plantilla desde el detalle.
          </Text>
          <View className="mt-6 w-full">
            <Button label="Volver" variant="ghost" onPress={() => cerrar()} />
          </View>
        </View>
      </Screen>
    );
  }

  return <QuoteForm quote={quote} />;
}
