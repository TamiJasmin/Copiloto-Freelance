import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SessionProvider, useSession } from '@/hooks/useSession';
import { applyWebHead } from '@/lib/webHead';
import { C } from '@/theme/tokens';
import '../global.css';

/** Portero: manda a login si no hay sesión, al dashboard si la hay. */
function AuthGate() {
  const { session, loading } = useSession();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const inAuth = segments[0] === '(auth)';
    // /q/<token> lo abre el cliente del usuario, que nunca va a tener cuenta.
    const isPublic = segments[0] === 'q';

    if (!session && !inAuth && !isPublic) router.replace('/login');
    if (session && inAuth) router.replace('/');
  }, [session, loading, segments]);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-bg">
        <ActivityIndicator color={C.accent} />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: C.bg },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="(app)" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="q/[token]" />
    </Stack>
  );
}

export default function RootLayout() {
  // El <head> de web se completa acá: es el único punto que corre siempre.
  useEffect(() => {
    applyWebHead();
  }, []);

  return (
    <SafeAreaProvider>
      <SessionProvider>
        <AuthGate />
      </SessionProvider>
    </SafeAreaProvider>
  );
}
