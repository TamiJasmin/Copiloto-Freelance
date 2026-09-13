import type { ReactElement, ReactNode } from 'react';
import {
  ScrollView,
  Text,
  useWindowDimensions,
  View,
  type RefreshControlProps,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { C } from '@/theme/tokens';

/**
 * Ancho de la columna de contenido.
 * La app es mobile-first: en un teléfono nunca se alcanza este límite, pero
 * en un navegador de escritorio es lo que evita que una tarjeta se estire a
 * 1900px y deje un número flotando en el vacío.
 */
export const COLUMN_WIDTH = 460;

/** Padding lateral único de toda la app. Se cambia acá o en ningún lado. */
export const GUTTER = 20;

type Props = {
  children: ReactNode;
  /** Fijo arriba, fuera del scroll. */
  header?: ReactNode;
  /** Fijo abajo: la acción principal de la pantalla. */
  footer?: ReactNode;
  scroll?: boolean;
  /** Centra vertical — para pantallas de un solo bloque, como el login. */
  center?: boolean;
  refreshControl?: ReactElement<RefreshControlProps>;
};

export function Screen({
  children,
  header,
  footer,
  scroll = true,
  center = false,
  refreshControl,
}: Props) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  // Sólo cuando sobra lugar a los costados la columna necesita delimitarse.
  const framed = width > COLUMN_WIDTH + GUTTER * 2;

  return (
    <View className="flex-1 bg-bg">
      <StatusBar style="light" />
      <SafeAreaView className="flex-1" edges={['top']}>
        <View
          className="w-full flex-1 self-center"
          style={{
            maxWidth: COLUMN_WIDTH,
            ...(framed
              ? { borderLeftWidth: 1, borderRightWidth: 1, borderColor: C.border }
              : null),
          }}
        >
          {header}

          {scroll ? (
            <ScrollView
              className="flex-1"
              contentContainerStyle={{
                paddingHorizontal: GUTTER,
                paddingBottom: footer ? 24 : insets.bottom + 32,
                flexGrow: center ? 1 : undefined,
                justifyContent: center ? 'center' : undefined,
              }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              refreshControl={refreshControl}
            >
              {children}
            </ScrollView>
          ) : (
            <View
              className={center ? 'flex-1 justify-center' : 'flex-1'}
              style={{ paddingHorizontal: GUTTER }}
            >
              {children}
            </View>
          )}

          {footer ? (
            <View
              className="border-t border-border"
              style={{
                paddingHorizontal: GUTTER,
                paddingTop: 14,
                paddingBottom: Math.max(insets.bottom, 16) + 6,
                backgroundColor: C.bg,
              }}
            >
              {footer}
            </View>
          ) : null}
        </View>
      </SafeAreaView>
    </View>
  );
}

/** Encabezado estándar: título a la izquierda, una acción a la derecha. */
export function ScreenHeader({
  overline,
  title,
  action,
}: {
  overline?: string;
  title: string;
  action?: ReactNode;
}) {
  return (
    <View
      className="flex-row items-center justify-between pb-6 pt-1"
      style={{ paddingHorizontal: GUTTER }}
    >
      <View className="flex-1 pr-4">
        {overline ? <Text className="text-label text-muted">{overline}</Text> : null}
        <Text className="text-title font-bold text-ink" numberOfLines={1}>
          {title}
        </Text>
      </View>
      {action}
    </View>
  );
}
