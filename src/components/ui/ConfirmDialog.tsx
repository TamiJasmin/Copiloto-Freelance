import { Modal, Pressable, Text, View } from 'react-native';
import { C } from '@/theme/tokens';

type Props = {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Pinta la acción en rojo: para lo que no se puede deshacer. */
  destructive?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

/**
 * Confirmación para acciones que no se pueden deshacer.
 *
 * No se usa Alert de React Native porque en web es un no-op: el borrado se
 * ejecutaba sin preguntar nada. Modal sí funciona en las tres plataformas.
 */
export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  destructive,
  busy,
  onConfirm,
  onCancel,
}: Props) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
      statusBarTranslucent
    >
      {/* Tocar afuera cancela: la salida siempre tiene que ser la fácil. */}
      <Pressable
        onPress={onCancel}
        accessibilityLabel="Cancelar"
        className="flex-1 items-center justify-center px-6"
        style={{ backgroundColor: 'rgba(0,0,0,0.65)' }}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          className="w-full rounded-2xl border border-border bg-surface p-5"
          style={{ maxWidth: 380 }}
        >
          <Text className="text-heading font-bold text-ink">{title}</Text>
          <Text className="mt-2 text-label leading-5 text-muted">{message}</Text>

          <View className="mt-6 flex-row">
            <Pressable
              onPress={onCancel}
              disabled={busy}
              accessibilityRole="button"
              className="mr-2 h-[46px] flex-1 items-center justify-center rounded-xl border border-border hover:opacity-90 active:opacity-70"
            >
              <Text className="text-label font-bold text-ink">{cancelLabel}</Text>
            </Pressable>

            <Pressable
              onPress={onConfirm}
              disabled={busy}
              accessibilityRole="button"
              className="ml-2 h-[46px] flex-1 items-center justify-center rounded-xl hover:opacity-90 active:opacity-70"
              style={{ backgroundColor: destructive ? C.danger : C.accent }}
            >
              <Text
                className="text-label font-bold"
                style={{ color: destructive ? C.ink : C.bg }}
              >
                {busy ? 'Un momento…' : confirmLabel}
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
