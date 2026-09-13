import { forwardRef, useState } from 'react';
import { Pressable, Text, TextInput, View, type TextInputProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C } from '@/theme/tokens';

type Props = TextInputProps & {
  label?: string;
  /** Prefijo fijo a la izquierda, ej. el símbolo de moneda. */
  prefix?: string;
  error?: string | null;
  /** Campo de contraseña: oculta el texto y agrega el ojo para revelarlo. */
  password?: boolean;
};

export const Input = forwardRef<TextInput, Props>(function Input(
  { label, prefix, error, password, style, ...rest },
  ref,
) {
  const [visible, setVisible] = useState(false);

  return (
    <View>
      {label ? (
        <Text className="mb-2 text-micro font-bold uppercase text-muted">{label}</Text>
      ) : null}

      <View
        className="h-[52px] flex-row items-center rounded-xl border bg-surface px-4"
        style={{ borderColor: error ? C.danger : C.border }}
      >
        {prefix ? <Text className="mr-1.5 text-body text-faint">{prefix}</Text> : null}
        <TextInput
          ref={ref}
          placeholderTextColor={C.faint}
          selectionColor={C.accent}
          secureTextEntry={password && !visible}
          className="flex-1 text-body text-ink"
          style={[{ height: '100%' }, style]}
          {...rest}
        />
        {password ? (
          <Pressable
            onPress={() => setVisible((v) => !v)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            className="ml-2 active:opacity-60"
          >
            <Ionicons name={visible ? 'eye-off-outline' : 'eye-outline'} size={19} color={C.faint} />
          </Pressable>
        ) : null}
      </View>

      {error ? (
        <Text className="mt-1.5 text-caption" style={{ color: C.danger }}>
          {error}
        </Text>
      ) : null}
    </View>
  );
});
