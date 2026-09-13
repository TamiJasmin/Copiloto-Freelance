import { useState } from 'react';
import { Text, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { Ionicons } from '@expo/vector-icons';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Screen } from '@/components/ui/Screen';
import { supabase } from '@/lib/supabase';
import { C } from '@/theme/tokens';

WebBrowser.maybeCompleteAuthSession();

export default function Login() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState<'email' | 'google' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const signInWithEmail = async () => {
    setBusy('email');
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: Linking.createURL('/') },
    });
    setBusy(null);
    if (error) setError(error.message);
    else setSent(true);
  };

  const signInWithGoogle = async () => {
    setBusy('google');
    setError(null);
    const redirectTo = Linking.createURL('/auth/callback');

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo, skipBrowserRedirect: true },
      });
      if (error || !data?.url) throw error ?? new Error('No se pudo iniciar Google');

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

      if (result.type === 'success') {
        const params = new URL(result.url.replace('#', '?')).searchParams;
        const access_token = params.get('access_token');
        const refresh_token = params.get('refresh_token');

        if (access_token && refresh_token) {
          await supabase.auth.setSession({ access_token, refresh_token });
        } else {
          // Supabase devuelve el motivo en la URL cuando rechaza el proveedor.
          setError(
            params.get('error_description') ??
              'Google no está habilitado en este proyecto de Supabase.',
          );
        }
      } else if (result.type !== 'cancel' && result.type !== 'dismiss') {
        setError('No pudimos completar el ingreso con Google.');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pudimos completar el ingreso con Google.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <Screen center>
      {/* ---------- Marca ---------- */}
      <View className="mb-9 items-center">
        <View className="mb-5 h-14 w-14 items-center justify-center rounded-2xl bg-accent">
          <Ionicons name="flash" size={26} color={C.bg} />
        </View>
        <Text className="text-title font-bold text-ink">Copiloto Freelance</Text>
        <Text className="mt-2 text-center text-label text-muted">
          Presupuestá, mandá por WhatsApp y cobrá.
        </Text>
      </View>

      {sent ? (
        <View className="items-center rounded-2xl border border-border bg-surface px-5 py-7">
          <View className="mb-4 h-11 w-11 items-center justify-center rounded-full bg-elevated">
            <Ionicons name="mail-outline" size={20} color={C.accent} />
          </View>
          <Text className="text-body font-semibold text-ink">Revisá tu correo</Text>
          <Text className="mt-1.5 text-center text-label text-muted">
            Te mandamos un link de acceso a{'\n'}
            <Text className="text-ink">{email.trim()}</Text>
          </Text>
          <Text
            onPress={() => setSent(false)}
            className="mt-5 text-label font-semibold text-muted"
            accessibilityRole="button"
          >
            Usar otro correo
          </Text>
        </View>
      ) : (
        <>
          <Input
            label="Tu correo"
            value={email}
            onChangeText={setEmail}
            placeholder="nombre@ejemplo.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            inputMode="email"
            onSubmitEditing={() => email.includes('@') && signInWithEmail()}
            returnKeyType="go"
          />

          <View className="mt-3">
            <Button
              label="Enviarme el link de acceso"
              loading={busy === 'email'}
              disabled={!email.includes('@') || busy !== null}
              onPress={signInWithEmail}
            />
          </View>

          <View className="my-5 flex-row items-center">
            <View className="h-px flex-1 bg-border" />
            <Text className="mx-3 text-caption text-faint">o</Text>
            <View className="h-px flex-1 bg-border" />
          </View>

          <Button
            label="Continuar con Google"
            icon="logo-google"
            variant="ghost"
            loading={busy === 'google'}
            disabled={busy !== null}
            onPress={signInWithGoogle}
          />
        </>
      )}

      {error ? (
        <View className="mt-5 rounded-xl border border-border bg-surface px-4 py-3">
          <Text className="text-label leading-5" style={{ color: C.danger }}>
            {error}
          </Text>
        </View>
      ) : null}
    </Screen>
  );
}
