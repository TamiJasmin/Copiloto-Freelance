import { Pressable, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C } from '@/theme/tokens';
import { money } from '@/lib/format';

/** Ítem en edición: el monto vive como string hasta que se guarda. */
export type ItemDraft = {
  key: string;
  description: string;
  amount: string;
};

export const emptyItem = (): ItemDraft => ({
  key: Math.random().toString(36).slice(2),
  description: '',
  amount: '',
});

/**
 * Convierte lo que tipea el usuario a número, tolerando formato local.
 * "150.000" en Argentina son ciento cincuenta mil, no 150 — de ahí la
 * heurística: un separador repetido, o seguido de exactamente 3 dígitos,
 * es separador de miles; en cualquier otro caso es el decimal.
 */
export const parseAmount = (raw: string): number => {
  const cleaned = raw.replace(/[^\d.,]/g, '');
  if (!cleaned) return 0;

  const dots = (cleaned.match(/\./g) ?? []).length;
  const commas = (cleaned.match(/,/g) ?? []).length;
  let normalized: string;

  if (dots && commas) {
    // Conviven los dos: el último que aparece es el decimal.
    normalized =
      cleaned.lastIndexOf(',') > cleaned.lastIndexOf('.')
        ? cleaned.replace(/\./g, '').replace(',', '.')
        : cleaned.replace(/,/g, '');
  } else if (dots || commas) {
    const sep = dots ? '.' : ',';
    const tail = cleaned.slice(cleaned.lastIndexOf(sep) + 1);
    const isThousands = (dots || commas) > 1 || tail.length === 3;
    normalized = isThousands ? cleaned.split(sep).join('') : cleaned.replace(sep, '.');
  } else {
    normalized = cleaned;
  }

  const n = parseFloat(normalized);
  return Number.isFinite(n) && n >= 0 ? n : 0;
};

export const itemsTotal = (items: ItemDraft[]): number =>
  items.reduce((sum, i) => sum + parseAmount(i.amount), 0);

type Props = {
  items: ItemDraft[];
  onChange: (items: ItemDraft[]) => void;
  currency?: string;
  error?: string | null;
};

export function ItemsEditor({ items, onChange, currency = 'ARS', error }: Props) {
  const update = (key: string, patch: Partial<ItemDraft>) =>
    onChange(items.map((i) => (i.key === key ? { ...i, ...patch } : i)));

  const remove = (key: string) => onChange(items.filter((i) => i.key !== key));

  return (
    <View>
      <View className="mb-2 flex-row items-center justify-between">
        <Text className="text-micro font-bold uppercase text-muted">
          Detalle
        </Text>
        <Text className="text-caption text-faint">
          {items.length} {items.length === 1 ? 'ítem' : 'ítems'}
        </Text>
      </View>

      {items.map((item, index) => (
        <View
          key={item.key}
          className="mb-2 flex-row items-center rounded-xl border bg-surface px-4"
          style={{ borderColor: error && index === 0 ? C.danger : C.border }}
        >
          <TextInput
            value={item.description}
            onChangeText={(description) => update(item.key, { description })}
            placeholder="Descripción"
            placeholderTextColor={C.faint}
            selectionColor={C.accent}
            className="h-[52px] flex-1 text-body text-ink"
          />

          <TextInput
            value={item.amount}
            onChangeText={(amount) => update(item.key, { amount })}
            placeholder="0"
            placeholderTextColor={C.faint}
            selectionColor={C.accent}
            keyboardType="decimal-pad"
            className="h-[52px] w-24 text-right text-body font-semibold text-ink"
            style={{ fontVariant: ['tabular-nums'] }}
          />

          {items.length > 1 ? (
            <Pressable
              onPress={() => remove(item.key)}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={`Quitar ítem ${index + 1}`}
              className="ml-2 active:opacity-60"
            >
              <Ionicons name="remove-circle-outline" size={19} color={C.faint} />
            </Pressable>
          ) : null}
        </View>
      ))}

      {error ? (
        <Text className="mb-2 text-caption" style={{ color: C.danger }}>
          {error}
        </Text>
      ) : null}

      <Pressable
        onPress={() => onChange([...items, emptyItem()])}
        accessibilityRole="button"
        accessibilityLabel="Agregar ítem"
        className="h-12 flex-row items-center justify-center rounded-xl border border-dashed border-border active:opacity-60"
      >
        <Ionicons name="add" size={17} color={C.muted} />
        <Text className="ml-1.5 text-label font-semibold text-muted">Agregar ítem</Text>
      </Pressable>

      {/* Total: siempre visible, siempre en acento. */}
      <View className="mt-5 flex-row items-baseline justify-between border-t border-border pt-4">
        <Text className="text-body font-semibold text-muted">Total</Text>
        <Text
          className="text-title font-bold text-accent"
          style={{ fontVariant: ['tabular-nums'] }}
        >
          {money(itemsTotal(items), currency)}
        </Text>
      </View>
    </View>
  );
}
