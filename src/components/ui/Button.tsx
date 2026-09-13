import { ActivityIndicator, Pressable, Text, View, type PressableProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C } from '@/theme/tokens';

type Props = PressableProps & {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  variant?: 'primary' | 'ghost';
  loading?: boolean;
};

export function Button({ label, icon, variant = 'primary', loading, ...rest }: Props) {
  const primary = variant === 'primary';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      {...rest}
      className={[
        'h-[52px] flex-row items-center justify-center rounded-xl hover:opacity-90 active:opacity-80',
        primary ? 'bg-accent' : 'border border-border bg-elevated',
      ].join(' ')}
      style={
        primary
          ? {
              shadowColor: C.accent,
              shadowOpacity: 0.25,
              shadowRadius: 20,
              shadowOffset: { width: 0, height: 8 },
              elevation: 6,
            }
          : undefined
      }
    >
      {loading ? (
        <ActivityIndicator color={primary ? C.bg : C.ink} />
      ) : (
        <View className="flex-row items-center">
          {icon ? (
            <Ionicons
              name={icon}
              size={19}
              color={primary ? C.bg : C.ink}
              style={{ marginRight: 8 }}
            />
          ) : null}
          <Text
            className="text-body font-bold"
            style={{ color: primary ? C.bg : C.ink }}
          >
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}
