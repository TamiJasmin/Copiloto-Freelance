import { Pressable, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C } from '@/theme/tokens';

type Props = {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
};

export function SearchBar({ value, onChange, placeholder = 'Buscar' }: Props) {
  return (
    <View className="h-[46px] flex-row items-center rounded-xl border border-border bg-surface px-3.5">
      <Ionicons name="search" size={17} color={C.faint} />
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={C.faint}
        selectionColor={C.accent}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        className="ml-2.5 h-full flex-1 text-body text-ink"
      />
      {value.length > 0 ? (
        <Pressable
          onPress={() => onChange('')}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Limpiar búsqueda"
          className="ml-2 active:opacity-60"
        >
          <Ionicons name="close-circle" size={17} color={C.faint} />
        </Pressable>
      ) : null}
    </View>
  );
}
