import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, Text, View } from 'react-native';
import { cerrar } from '@/lib/nav';
import { Ionicons } from '@expo/vector-icons';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Screen, ScreenHeader } from '@/components/ui/Screen';
import { useSession } from '@/hooks/useSession';
import { supabase } from '@/lib/supabase';
import { authError, friendlyError } from '@/lib/errors';
import { guardarCredencialMP, tieneCredencialMP } from '@/services/mercadopago';
import { C } from '@/theme/tokens';
import type { PaymentInfo } from '@/types/db';

const MIN_PASSWORD = 8;

const TIPOS: { value: NonNullable<PaymentInfo['tipo']>; label: string; hint: string }[] = [
  { value: 'alias', label: 'Alias', hint: 'mi.alias.mp' },
  { value: 'cbu', label: 'CBU / CVU', hint: '0000003100000000000000' },
  { value: 'mp', label: 'Mercado Pago', hint: 'link.mercadopago.com.ar/tunegocio' },
  { value: 'paypal', label: 'PayPal', hint: 'paypal.me/tunegocio' },
];

export default function Settings() {
  const { session, profile, refreshProfile, signOut } = useSession();

  const [businessName, setBusinessName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [tipo, setTipo] = useState<NonNullable<PaymentInfo['tipo']>>('alias');
  const [valor, setValor] = useState('');
  const [titular, setTitular] = useState('');

  const [mpToken, setMpToken] = useState('');
  const [mpConectado, setMpConectado] = useState(false);
  const [mpGuardando, setMpGuardando] = useState(false);
  const [mpError, setMpError] = useState<string | null>(null);

  const [newPassword, setNewPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // El perfil llega asincrónico: se vuelca al formulario cuando aparece.
  useEffect(() => {
    if (!profile) return;
    setBusinessName(profile.business_name ?? '');
    setLogoUrl(profile.logo_url ?? '');
    setTipo(profile.payment_info?.tipo ?? 'alias');
    setValor(profile.payment_info?.valor ?? '');
    setTitular(profile.payment_info?.titular ?? '');
  }, [profile]);

  // Se pregunta por un booleano: el token no se puede leer de vuelta.
  useEffect(() => {
    tieneCredencialMP().then(setMpConectado);
  }, []);

  const guardarMP = async () => {
    if (!session?.user) return;
    setMpGuardando(true);
    setMpError(null);
    try {
      await guardarCredencialMP(mpToken);
      setMpToken('');
      setMpConectado(await tieneCredencialMP());
    } catch (e) {
      console.error('[mercadopago]', e);
      setMpError(friendlyError(e));
    } finally {
      setMpGuardando(false);
    }
  };

  const save = async () => {
    if (!session?.user) return setError('Tu sesión expiró, volvé a entrar.');

    setSaving(true);
    setError(null);
    setSaved(false);

    try {
      const payment_info: PaymentInfo = valor.trim()
        ? { tipo, valor: valor.trim(), titular: titular.trim() || undefined }
        : {};

      const { error } = await supabase
        .from('users')
        .update({
          business_name: businessName.trim() || null,
          logo_url: logoUrl.trim() || null,
          payment_info,
        })
        .eq('id', session.user.id);

      if (error) throw error;

      await refreshProfile();
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      console.error('[mi negocio]', e);
      setError(friendlyError(e));
    } finally {
      setSaving(false);
    }
  };

  const savePassword = async () => {
    setSavingPassword(true);
    setPasswordError(null);
    setPasswordSaved(false);

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPassword(false);

    if (error) return setPasswordError(authError(error));

    setNewPassword('');
    setPasswordSaved(true);
    setTimeout(() => setPasswordSaved(false), 3000);
  };

  const tipoActual = TIPOS.find((t) => t.value === tipo)!;

  return (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Screen
        header={
          <ScreenHeader
            title="Mi negocio"
            action={
              <Pressable
                onPress={() => cerrar()}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Cerrar"
                className="h-10 w-10 items-center justify-center rounded-full bg-surface active:opacity-70"
              >
                <Ionicons name="close" size={19} color={C.muted} />
              </Pressable>
            }
          />
        }
        footer={
          <Button
            label={saved ? 'Guardado' : 'Guardar cambios'}
            icon={saved ? 'checkmark' : undefined}
            loading={saving}
            disabled={saving}
            onPress={save}
          />
        }
      >
        <Text className="mb-6 text-label leading-5 text-muted">
          Esto es lo que ve tu cliente en cada presupuesto.
        </Text>

        <Input
          label="Nombre del negocio"
          value={businessName}
          onChangeText={setBusinessName}
          placeholder="Mi Estudio"
          autoCapitalize="words"
        />

        <View className="mt-5">
          <Input
            label="Logo (URL)"
            value={logoUrl}
            onChangeText={setLogoUrl}
            placeholder="https://…/logo.png"
            autoCapitalize="none"
            keyboardType="url"
          />
          <Text className="mt-1.5 text-caption text-faint">
            Opcional. Por ahora se pega un link a una imagen.
          </Text>
        </View>

        {/* ---------- Datos de cobro ---------- */}
        <View className="mt-8">
          <Text className="mb-2 text-micro font-bold uppercase text-muted">Cómo te pagan</Text>

          <View className="mb-3 flex-row flex-wrap gap-2">
            {TIPOS.map((t) => {
              const active = t.value === tipo;
              return (
                <Pressable
                  key={t.value}
                  onPress={() => setTipo(t.value)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                  className={[
                    'rounded-full border px-3.5 py-2 active:opacity-70',
                    active
                      ? 'border-accent bg-accent'
                      : 'border-border bg-surface hover:border-muted hover:bg-elevated',
                  ].join(' ')}
                >
                  <Text
                    className="text-label font-semibold"
                    style={{ color: active ? C.bg : C.muted }}
                  >
                    {t.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Input
            value={valor}
            onChangeText={setValor}
            placeholder={tipoActual.hint}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType={tipo === 'mp' || tipo === 'paypal' ? 'url' : 'default'}
          />

          {tipo === 'mp' || tipo === 'paypal' ? (
            <Text className="mt-1.5 text-caption leading-4 text-faint">
              Pegá tu link de cobro, no el alias: así tu cliente paga de un toque desde el
              presupuesto. Si ponés un alias igual funciona, pero lo va a tener que copiar.
            </Text>
          ) : null}

          <View className="mt-3">
            <Input
              value={titular}
              onChangeText={setTitular}
              placeholder="Titular de la cuenta (opcional)"
              autoCapitalize="words"
            />
          </View>

          {!valor.trim() ? (
            <View
              className="mt-3 flex-row rounded-xl border px-4 py-3"
              style={{ borderColor: 'rgba(255,176,32,0.35)', backgroundColor: 'rgba(255,176,32,0.08)' }}
            >
              <Ionicons name="alert-circle-outline" size={17} color={C.sent} />
              <Text className="ml-2 flex-1 text-label leading-5" style={{ color: C.sent }}>
                Sin esto, tus presupuestos salen sin decirle al cliente dónde transferir.
              </Text>
            </View>
          ) : null}
        </View>

        {error ? (
          <View className="mt-5 rounded-xl border border-border bg-surface px-4 py-3">
            <Text className="text-label leading-5" style={{ color: C.danger }}>
              {error}
            </Text>
          </View>
        ) : null}

        {/* ---------- Cobro automático con Mercado Pago ---------- */}
        <View className="mt-10 border-t border-border pt-6">
          <View className="flex-row items-center">
            <Text className="flex-1 text-micro font-bold uppercase text-muted">
              Cobro automático
            </Text>
            {mpConectado ? (
              <View className="flex-row items-center">
                <View
                  className="mr-1.5 h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: C.paid }}
                />
                <Text className="text-caption font-semibold" style={{ color: C.paid }}>
                  Conectado
                </Text>
              </View>
            ) : null}
          </View>

          <Text className="mt-2 text-label leading-5 text-muted">
            Con tu cuenta de Mercado Pago conectada, Lana genera el link de pago con el monto
            exacto de cada presupuesto. Tu cliente paga de un toque, sin escribir el importe.
          </Text>

          <View className="mt-3">
            <Input
              value={mpToken}
              onChangeText={setMpToken}
              placeholder={mpConectado ? 'Pegá otro token para reemplazarlo' : 'APP_USR-… o TEST-…'}
              password
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <Text className="mt-1.5 text-caption leading-4 text-faint">
            Es el Access Token de tu aplicación en Mercado Pago → Tus integraciones → Credenciales.
            Empezá con las de prueba: con las de producción cada link cobra plata de verdad.
          </Text>

          <Pressable
            onPress={guardarMP}
            disabled={!mpToken.trim() || mpGuardando}
            hitSlop={8}
            accessibilityRole="button"
            className="mt-3 self-start active:opacity-60"
          >
            <Text
              className="text-label font-bold"
              style={{ color: mpToken.trim() ? C.accent : C.faint }}
            >
              {mpGuardando ? 'Guardando…' : mpConectado ? 'Reemplazar token' : 'Conectar cuenta'}
            </Text>
          </Pressable>

          {mpError ? (
            <Text className="mt-2 text-caption leading-4" style={{ color: C.danger }}>
              {mpError}
            </Text>
          ) : null}

          <Text className="mt-3 text-caption leading-4 text-faint">
            Por seguridad el token no se puede volver a leer desde la app, ni siquiera por vos:
            sólo lo usa el servidor al generar un link.
          </Text>
        </View>

        {/* ---------- Cuenta ---------- */}
        <View className="mt-10 border-t border-border pt-6">
          <Text className="text-micro font-bold uppercase text-muted">Cuenta</Text>
          <Text className="mt-2 text-label text-muted">{session?.user?.email}</Text>

          <View className="mt-5">
            <Text className="text-label font-semibold text-ink">Contraseña</Text>
            {/* Supabase no expone si la cuenta ya tiene contraseña, así que
                el texto sirve para ambos casos en vez de afirmar de más. */}
            <Text className="mt-1 text-caption leading-4 text-muted">
              Definí una para entrar directo, sin esperar el correo. Si ya tenías una, esta la
              reemplaza. El link de acceso va a seguir funcionando igual.
            </Text>

            <View className="mt-3">
              <Input
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder={`Al menos ${MIN_PASSWORD} caracteres`}
                password
                autoCapitalize="none"
                autoComplete="new-password"
              />
            </View>

            <Pressable
              onPress={savePassword}
              disabled={newPassword.length < MIN_PASSWORD || savingPassword}
              hitSlop={8}
              accessibilityRole="button"
              className="mt-3 self-start active:opacity-60"
            >
              <Text
                className="text-label font-bold"
                style={{
                  color: newPassword.length >= MIN_PASSWORD ? C.accent : C.faint,
                }}
              >
                {savingPassword
                  ? 'Guardando…'
                  : passwordSaved
                    ? 'Contraseña guardada'
                    : 'Guardar contraseña'}
              </Text>
            </Pressable>

            {passwordError ? (
              <Text className="mt-2 text-caption leading-4" style={{ color: C.danger }}>
                {passwordError}
              </Text>
            ) : null}
          </View>

          <Pressable
            onPress={signOut}
            hitSlop={8}
            accessibilityRole="button"
            className="mt-7 self-start active:opacity-60"
          >
            <Text className="text-label font-bold" style={{ color: C.danger }}>
              Cerrar sesión
            </Text>
          </Pressable>
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}
