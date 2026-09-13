import { Pressable, ScrollView, Text, View } from 'react-native';
import { C } from '@/theme/tokens';

export type ChipOption<T extends string> = {
  value: T;
  label: string;
  /** Cantidad de elementos. Se oculta si es 0 y no está seleccionado. */
  count?: number;
};

type Props<T extends string> = {
  options: ChipOption<T>[];
  value: T;
  onChange: (value: T) => void;
};

/**
 * Filtros en una fila que se desplaza. Se prefiere esto a un menú
 * desplegable porque deja ver de un vistazo cuántos hay en cada estado,
 * que suele ser la respuesta que se busca antes de filtrar.
 */
export function FilterChips<T extends string>({ options, value, onChange }: Props<T>) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 8, paddingRight: 4 }}
    >
      {options.map((o) => {
        const active = o.value === value;
        const vacio = (o.count ?? 0) === 0 && o.count !== undefined && !active;

        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            className={[
              'h-9 flex-row items-center rounded-full border px-3.5 active:opacity-70',
              active
                ? 'border-accent bg-accent'
                : 'border-border bg-surface hover:border-muted hover:bg-elevated',
            ].join(' ')}
            style={vacio ? { opacity: 0.45 } : undefined}
          >
            <Text
              className="text-label font-semibold"
              style={{ color: active ? C.bg : C.muted }}
            >
              {o.label}
            </Text>
            {o.count !== undefined ? (
              <View
                className="ml-1.5 rounded-full px-1.5"
                style={{ backgroundColor: active ? 'rgba(0,0,0,0.14)' : C.elevated }}
              >
                <Text
                  className="text-micro font-bold"
                  style={{ color: active ? C.bg : C.faint }}
                >
                  {o.count}
                </Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
