import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { Ionicons } from '@expo/vector-icons';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Screen } from '@/components/ui/Screen';
import { supabase } from '@/lib/supabase';
import { authError } from '@/lib/errors';
import { C } from '@/theme/tokens';

WebBrowser.maybeCompleteAuthSession();

type Mode = 'entrar' | 'registro';
type Busy = 'password' | 'magic' | 'google' | 'reset' | null;
type Notice = { tone: 'ok' | 'error'; text: string } | null;

const MIN_PASSWORD = 8;

export default function Login() {
  const [mode, setMode] = useState<Mode>('entrar');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState<Busy>(null);
  const [notice, setNotice] = useState<Notice>(null);

  const cleanEmail = email.trim().toLowerCase();
  const emailOk = /\S+@\S+\.\S+/.test(cleanEmail);
  const passwordOk = password.length >= MIN_PASSWORD;

  const fail = (e: unknown) => setNotice({ tone: 'error', text: authError(e) });

  /** Ingreso directo: el camino de todos los días para quien ya tiene cuenta. */
  const signIn = async () => {
    setBusy('password');
    setNotice(null);
    const { error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });
    setBusy(null);
    if (error) fail(error);
    // Con éxito, el portero de rutas redirige solo.
  };

  const signUp = async () => {
    setBusy('password');
    setNotice(null);
    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: { emailRedirectTo: Linking.createURL('/') },
    });
    setBusy(null);

    if (error) return fail(error);

    // Supabase devuelve un usuario sin identidades cuando el correo ya
    // existe, para no revelar quién está registrado.
    if (data.user && data.user.identities?.length === 0) {
      return setNotice({
        tone: 'error',
        text: 'Ese correo ya tiene cuenta. Cambiá a "Ingresar".',
      });
    }

    if (!data.session) {
      setNotice({
        tone: 'ok',
        text: `Te mandamos un correo a ${cleanEmail} para confirmar la cuenta.`,
      });
    }
  };

  /** Sin contraseña: sirve para entrar la primera vez y para recuperarla. */
  const sendMagicLink = async () => {
    setBusy('magic');
    setNotice(null);
    const { error } = await supabase.auth.signInWithOtp({
      email: cleanEmail,
      options: { emailRedirectTo: Linking.createURL('/') },
    });
    setBusy(null);
    if (error) return fail(error);
    setNotice({
      tone: 'ok',
      text: `Te mandamos un link de acceso a ${cleanEmail}. Abrilo desde este dispositivo.`,
    });
  };

  const resetPassword = async () => {
    setBusy('reset');
    setNotice(null);
    const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo: Linking.createURL('/settings'),
    });
    setBusy(null);
    if (error) return fail(error);
    setNotice({
      tone: 'ok',
      text: `Te mandamos un correo a ${cleanEmail}. Al abrirlo vas a entrar a la app y podés definir una contraseña nueva en Mi negocio.`,
    });
  };

  const signInWithGoogle = async () => {
    setBusy('google');
    setNotice(null);
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
          setNotice({
            tone: 'error',
            text:
              params.get('error_description') ??
              'Google no está habilitado en este proyecto de Supabase.',
          });
        }
      } else if (result.type !== 'cancel' && result.type !== 'dismiss') {
        setNotice({ tone: 'error', text: 'No pudimos completar el ingreso con Google.' });
      }
    } catch (e) {
      console.error('[login google]', e);
      fail(e);
    } finally {
      setBusy(null);
    }
  };

  const entrando = mode === 'entrar';
  const anyBusy = busy !== null;

  return (
    <Screen center>
      {/* ---------- Marca ---------- */}
      <View className="mb-8 items-center">
        <View className="mb-5 h-14 w-14 items-center justify-center rounded-2xl bg-accent">
          <Ionicons name="flash" size={26} color={C.bg} />
        </View>
        <Text className="text-title font-bold text-ink">Copiloto Freelance</Text>
        <Text className="mt-2 text-center text-label text-muted">
          {entrando
            ? 'Presupuestá, mandá por WhatsApp y cobrá.'
            : 'Creá tu cuenta y mandá tu primer presupuesto hoy.'}
        </Text>
      </View>

      <Input
        label="Tu correo"
        value={email}
        onChangeText={setEmail}
        placeholder="nombre@ejemplo.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        inputMode="email"
        autoCorrect={false}
      />

      <View className="mt-4">
        <Input
          label="Contraseña"
          value={password}
          onChangeText={setPassword}
          placeholder={entrando ? 'Tu contraseña' : `Al menos ${MIN_PASSWORD} caracteres`}
          password
          autoCapitalize="none"
          autoComplete={entrando ? 'current-password' : 'new-password'}
          returnKeyType="go"
          onSubmitEditing={() => emailOk && passwordOk && (entrando ? signIn() : signUp())}
        />
      </View>

      <View className="mt-4">
        <Button
          label={entrando ? 'Ingresar' : 'Crear cuenta'}
          loading={busy === 'password'}
          disabled={!emailOk || !passwordOk || anyBusy}
          onPress={entrando ? signIn : signUp}
        />
      </View>

      {entrando ? (
        <Pressable
          onPress={resetPassword}
          disabled={!emailOk || anyBusy}
          hitSlop={8}
          accessibilityRole="button"
          className="mt-3.5 items-center active:opacity-60"
        >
          <Text className="text-label font-semibold" style={{ color: emailOk ? C.muted : C.faint }}>
            {busy === 'reset' ? 'Enviando…' : 'Olvidé mi contraseña'}
          </Text>
        </Pressable>
      ) : null}

      {/* ---------- Alternativas ---------- */}
      <View className="my-5 flex-row items-center">
        <View className="h-px flex-1 bg-border" />
        <Text className="mx-3 text-caption text-faint">o</Text>
        <View className="h-px flex-1 bg-border" />
      </View>

      <Button
        label="Enviarme un link de acceso"
        icon="mail-outline"
        variant="ghost"
        loading={busy === 'magic'}
        disabled={!emailOk || anyBusy}
        onPress={sendMagicLink}
      />

      <View className="mt-3">
        <Button
          label="Continuar con Google"
          icon="logo-google"
          variant="ghost"
          loading={busy === 'google'}
          disabled={anyBusy}
          onPress={signInWithGoogle}
        />
      </View>

      {/* ---------- Cambio de modo ---------- */}
      <Pressable
        onPress={() => {
          setMode(entrando ? 'registro' : 'entrar');
          setNotice(null);
        }}
        hitSlop={8}
        accessibilityRole="button"
        className="mt-7 items-center active:opacity-60"
      >
        <Text className="text-label text-muted">
          {entrando ? '¿No tenés cuenta? ' : '¿Ya tenés cuenta? '}
          <Text className="font-bold text-accent">{entrando ? 'Creá una' : 'Ingresá'}</Text>
        </Text>
      </Pressable>

      {notice ? (
        <View
          className="mt-5 rounded-xl border px-4 py-3"
          style={{
            borderColor: notice.tone === 'ok' ? C.border : 'rgba(255,92,92,0.35)',
            backgroundColor: notice.tone === 'ok' ? C.surface : 'rgba(255,92,92,0.08)',
          }}
        >
          <Text
            className="text-label leading-5"
            style={{ color: notice.tone === 'ok' ? C.muted : C.danger }}
          >
            {notice.text}
          </Text>
        </View>
      ) : null}
    </Screen>
  );
}
