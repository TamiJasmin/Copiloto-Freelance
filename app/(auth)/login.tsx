import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';
import { C } from '@/theme/tokens';

WebBrowser.maybeCompleteAuthSession();

export default function Login() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signInWithEmail = async () => {
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: Linking.createURL('/') },
    });
    setBusy(false);
    error ? setError(error.message) : setSent(true);
  };

  const signInWithGoogle = async () => {
    setBusy(true);
    setError(null);
    const redirectTo = Linking.createURL('/auth/callback');
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo, skipBrowserRedirect: true },
    });
    if (error || !data?.url) {
      setBusy(false);
      setError(error?.message ?? 'No se pudo iniciar Google');
      return;
    }

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (result.type === 'success') {
      const params = new URL(result.url.replace('#', '?')).searchParams;
      const access_token = params.get('access_token');
      const refresh_token = params.get('refresh_token');
      if (access_token && refresh_token) {
        await supabase.auth.setSession({ access_token, refresh_token });
      }
    }
    setBusy(false);
  };

  return (
    <View className="flex-1 bg-bg">
      <SafeAreaView className="flex-1 justify-center px-6">
        <Text className="text-[32px] font-bold tracking-tight text-ink">Copiloto</Text>
        <Text className="mb-10 mt-1.5 text-[15px] leading-6 text-muted">
          Presupuestá, mandá por WhatsApp y cobrá.{'\n'}Sin planillas.
        </Text>

        {sent ? (
          <View className="rounded-2xl border border-border bg-surface p-5">
            <Text className="text-[15px] font-semibold text-ink">Revisá tu mail</Text>
            <Text className="mt-1.5 text-[13px] leading-5 text-muted">
              Te mandamos un link de acceso a {email}.
            </Text>
          </View>
        ) : (
          <>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="tu@email.com"
              placeholderTextColor={C.faint}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              className="mb-3 h-14 rounded-2xl border border-border bg-surface px-4 text-[16px] text-ink"
            />
            <Button
              label="Continuar con email"
              onPress={signInWithEmail}
              loading={busy}
              disabled={!email.includes('@') || busy}
            />

            <View className="my-5 flex-row items-center">
              <View className="h-px flex-1 bg-border" />
              <Text className="mx-3 text-[12px] text-faint">o</Text>
              <View className="h-px flex-1 bg-border" />
            </View>

            <Button
              label="Continuar con Google"
              icon="logo-google"
              variant="ghost"
              onPress={signInWithGoogle}
              disabled={busy}
            />
          </>
        )}

        {error ? (
          <Text className="mt-4 text-center text-[13px]" style={{ color: C.danger }}>
            {error}
          </Text>
        ) : null}
      </SafeAreaView>
    </View>
  );
}
