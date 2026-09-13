import { forwardRef } from 'react';
import { Text, TextInput, View, type TextInputProps } from 'react-native';
import { C } from '@/theme/tokens';

type Props = TextInputProps & {
  label?: string;
  /** Prefijo fijo a la izquierda, ej. el símbolo de moneda. */
  prefix?: string;
  error?: string | null;
};

export const Input = forwardRef<TextInput, Props>(function Input(
  { label, prefix, error, style, ...rest },
  ref,
) {
  return (
    <View>
      {label ? (
        <Text className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-muted">
          {label}
        </Text>
      ) : null}

      <View
        className="h-14 flex-row items-center rounded-xl border bg-surface px-4"
        style={{ borderColor: error ? C.danger : C.border }}
      >
        {prefix ? <Text className="mr-1.5 text-[16px] text-faint">{prefix}</Text> : null}
        <TextInput
          ref={ref}
          placeholderTextColor={C.faint}
          selectionColor={C.accent}
          className="flex-1 text-[16px] text-ink"
          style={[{ height: '100%' }, style]}
          {...rest}
        />
      </View>

      {error ? (
        <Text className="mt-1.5 text-[12px]" style={{ color: C.danger }}>
          {error}
        </Text>
      ) : null}
    </View>
  );
});
