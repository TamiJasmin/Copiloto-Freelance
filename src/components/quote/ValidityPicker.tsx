import { Pressable, Text, View } from 'react-native';
import { diasHasta, fechaEnDias } from '@/lib/format';
import { C } from '@/theme/tokens';

type Props = {
  /** Fecha en formato YYYY-MM-DD, o null si el presupuesto no vence. */
  value: string | null;
  onChange: (value: string | null) => void;
};

const OPCIONES: { dias: number | null; label: string }[] = [
  { dias: null, label: 'Sin vencimiento' },
  { dias: 7, label: '7 días' },
  { dias: 15, label: '15 días' },
  { dias: 30, label: '30 días' },
];

const LARGO = new Intl.DateTimeFormat('es-AR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

/**
 * Vencimiento por atajos en vez de calendario.
 *
 * Un selector de fecha son tres toques y una pantalla modal; acá el caso
 * real es "vale un par de semanas", no una fecha puntual. Los atajos lo
 * resuelven en un toque y muestran la fecha resultante para que no haya
 * que calcular nada mentalmente.
 */
export function ValidityPicker({ value, onChange }: Props) {
  const seleccion = diasHasta(value);

  return (
    <View>
      <Text className="mb-2 text-micro font-bold uppercase text-muted">Válido por</Text>

      <View className="flex-row flex-wrap gap-2">
        {OPCIONES.map((o) => {
          // Se compara contra los días restantes: así, al editar, queda
          // marcada la opción correcta aunque la fecha se haya guardado ayer.
          const activo = o.dias === null ? value === null : seleccion === o.dias;

          return (
            <Pressable
              key={o.label}
              onPress={() => onChange(o.dias === null ? null : fechaEnDias(o.dias))}
              accessibilityRole="radio"
              accessibilityState={{ selected: activo }}
              className={[
                'h-9 items-center justify-center rounded-full border px-3.5 active:opacity-70',
                // hover: en web avisa que el chip es tocable antes de tocarlo.
                activo
                  ? 'border-accent bg-accent'
                  : 'border-border bg-surface hover:border-muted hover:bg-elevated',
              ].join(' ')}
            >
              <Text
                className="text-label font-semibold"
                style={{ color: activo ? C.bg : C.muted }}
              >
                {o.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {value ? (
        <Text className="mt-2 text-caption text-faint">
          Vence el {LARGO.format(new Date(`${value}T12:00:00`))}
          {seleccion !== null && seleccion < 0 ? ' — ya pasó' : ''}
        </Text>
      ) : (
        <Text className="mt-2 text-caption text-faint">
          El presupuesto no caduca. Poner una fecha ayuda a que el cliente decida.
        </Text>
      )}
    </View>
  );
}
