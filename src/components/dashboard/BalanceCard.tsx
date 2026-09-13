import { Text, View } from 'react-native';
import { C } from '@/theme/tokens';
import { currentMonthLabel, money } from '@/lib/format';

type Props = {
  quoted: number;
  collected: number;
  currency?: string;
};

/**
 * La tarjeta que responde la única pregunta que importa al abrir la app:
 * "de todo lo que presupuesté este mes, ¿cuánto entró?"
 */
export function BalanceCard({ quoted, collected, currency = 'ARS' }: Props) {
  const ratio = quoted > 0 ? Math.min(collected / quoted, 1) : 0;
  const pct = Math.round(ratio * 100);

  return (
    <View className="rounded-2xl border border-border bg-surface p-5">
      <View className="flex-row items-center justify-between">
        <Text className="text-[12px] font-semibold uppercase tracking-widest text-muted">
          Cobrado
        </Text>
        <Text className="text-[12px] capitalize text-faint">{currentMonthLabel()}</Text>
      </View>

      <Text
        className="mt-2 text-display font-bold text-accent"
        style={{ fontVariant: ['tabular-nums'] }}
      >
        {money(collected, currency)}
      </Text>

      {/* Barra cobrado / presupuestado */}
      <View className="mt-5 h-2 w-full overflow-hidden rounded-full bg-elevated">
        <View
          className="h-full rounded-full bg-accent"
          style={{ width: `${Math.max(pct, quoted > 0 && collected > 0 ? 4 : 0)}%` }}
        />
      </View>

      <View className="mt-3 flex-row items-center justify-between">
        <Text className="text-[13px] text-muted">
          de <Text className="font-semibold text-ink">{money(quoted, currency)}</Text> presupuestado
        </Text>
        <Text className="text-[13px] font-semibold" style={{ color: C.muted }}>
          {pct}%
        </Text>
      </View>
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
      <Text className="text-[11px] font-semibold uppercase tracking-wider text-faint">{label}</Text>
      <Text
        className="mt-1.5 text-[19px] font-bold text-ink"
        style={{ color: accent ?? C.ink, fontVariant: ['tabular-nums'] }}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}
