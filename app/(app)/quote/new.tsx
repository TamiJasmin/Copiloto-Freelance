import { ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { QuoteForm } from '@/components/quote/QuoteForm';
import { Screen } from '@/components/ui/Screen';
import { useQuote } from '@/hooks/useQuotes';
import { C } from '@/theme/tokens';

/**
 * Alta de presupuesto.
 *
 * Con `?from=<id>` arranca copiando ese presupuesto: mismos ítems, mismo
 * cliente y la misma duración de validez. No se crea nada hasta guardar, así
 * probar una plantilla no deja borradores sueltos dando vueltas.
 */
export default function NewQuote() {
  const { from } = useLocalSearchParams<{ from?: string }>();
  const { quote, loading } = useQuote(from);

  // Sólo se espera si hay algo que copiar; el alta en blanco es inmediata.
  if (from && loading) {
    return (
      <Screen scroll={false} center>
        <ActivityIndicator color={C.accent} />
      </Screen>
    );
  }

  return <QuoteForm plantilla={quote ?? undefined} />;
}
