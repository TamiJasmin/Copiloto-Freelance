import { Stack } from 'expo-router';
import { C } from '@/theme/tokens';

export default function AppLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: C.bg },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="quote/new" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
