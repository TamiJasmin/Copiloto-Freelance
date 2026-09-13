import { Text, View } from 'react-native';
import { C } from '@/theme/tokens';
import { currentMonthLabel, money } from '@/lib/format';

type Props = {
  quoted: number;
  collected: number;
  currency?: string;
};

/**
 * Responde la única pregunta que importa al abrir la app:
 * "de todo lo que presupuesté este mes, ¿cuánto entró?"
 */
export function BalanceCard({ quoted, collected, currency = 'ARS' }: Props) {
  const ratio = quoted > 0 ? Math.min(collected / quoted, 1) : 0;
  const pct = Math.round(ratio * 100);
  const started = quoted > 0;

  return (
    <View className="rounded-2xl border border-border bg-surface p-5">
      <View className="flex-row items-center justify-between">
        <Text className="text-micro font-bold uppercase text-muted">Cobrado</Text>
        <View className="rounded-full bg-elevated px-2.5 py-1">
          <Text className="text-caption capitalize text-muted">{currentMonthLabel()}</Text>
        </View>
      </View>

      <Text
        className="mt-3 text-display font-bold"
        style={{
          color: collected > 0 ? C.accent : C.ink,
          fontVariant: ['tabular-nums'],
        }}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {money(collected, currency)}
      </Text>

      {started ? (
        <>
          <View className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-elevated">
            <View
              className="h-full rounded-full bg-accent"
              style={{ width: `${Math.max(pct, collected > 0 ? 3 : 0)}%` }}
            />
          </View>

          <View className="mt-2.5 flex-row items-center justify-between">
            <Text className="text-label text-muted">
              de <Text className="font-semibold text-ink">{money(quoted, currency)}</Text>{' '}
              presupuestado
            </Text>
            <Text className="text-label font-semibold text-muted">{pct}%</Text>
          </View>
        </>
      ) : (
        // Sin presupuestos del mes, una barra al 0% y un "0%" son ruido:
        // no informan nada que el número grande no haya dicho ya.
        <Text className="mt-2.5 text-label text-faint">
          Todavía no presupuestaste nada este mes.
        </Text>
      )}
    </View>
  );
}

/** Métrica secundaria: dos por fila, sin ruido. */
export function MiniStat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <View className="flex-1 rounded-xl border border-border bg-surface px-4 py-3.5">
      <Text className="text-micro font-bold uppercase text-faint">{label}</Text>
      <Text
        className="mt-1.5 text-heading font-bold"
        style={{ color: accent ?? C.ink, fontVariant: ['tabular-nums'] }}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}
