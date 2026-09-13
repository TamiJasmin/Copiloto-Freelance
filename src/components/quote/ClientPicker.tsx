import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Input } from '@/components/ui/Input';
import { filterClients } from '@/hooks/useClients';
import { C } from '@/theme/tokens';
import type { Client } from '@/types/db';

/** Lo que el formulario necesita saber del cliente elegido. */
export type ClientDraft = {
  id: string | null;
  name: string;
  whatsapp: string;
};

type Props = {
  clients: Client[];
  value: ClientDraft;
  onChange: (draft: ClientDraft) => void;
  error?: string | null;
};

/**
 * Un solo campo hace las dos cosas: buscar en la agenda y dar de alta.
 * Si lo que escribís no existe, el alta aparece sola — sin pantalla aparte.
 */
export function ClientPicker({ clients, value, onChange, error }: Props) {
  const [open, setOpen] = useState(false);

  const picked = value.id !== null;
  const matches = filterClients(clients, value.name);
  const exactMatch = matches.some((c) => c.name.toLowerCase() === value.name.trim().toLowerCase());
  const showCreate = !picked && value.name.trim().length >= 2 && !exactMatch;

  const select = (c: Client) => {
    onChange({ id: c.id, name: c.name, whatsapp: c.whatsapp_number ?? '' });
    setOpen(false);
  };

  const clear = () => {
    onChange({ id: null, name: '', whatsapp: '' });
    setOpen(true);
  };

  return (
    <View>
      <Text className="mb-2 text-micro font-bold uppercase text-muted">
        Cliente
      </Text>

      {picked ? (
        // Elegido: fila compacta, un toque para cambiarlo.
        <Pressable
          onPress={clear}
          accessibilityRole="button"
          accessibilityLabel={`Cliente ${value.name}. Tocar para cambiar`}
          className="h-[52px] flex-row items-center rounded-xl border border-border bg-surface px-4 active:opacity-70"
        >
          <View className="h-8 w-8 items-center justify-center rounded-full bg-elevated">
            <Text className="text-label font-bold text-muted">
              {value.name.trim().charAt(0).toUpperCase()}
            </Text>
          </View>
          <View className="ml-3 flex-1">
            <Text className="text-body font-semibold text-ink" numberOfLines={1}>
              {value.name}
            </Text>
            {value.whatsapp ? (
              <Text className="text-caption text-faint">+{value.whatsapp}</Text>
            ) : null}
          </View>
          <Ionicons name="close-circle" size={19} color={C.faint} />
        </Pressable>
      ) : (
        <>
          <Input
            value={value.name}
            onChangeText={(name) => {
              onChange({ ...value, id: null, name });
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder="Buscar o escribir un nombre"
            autoCapitalize="words"
            error={error}
          />

          {open && matches.length > 0 ? (
            <View className="mt-2 overflow-hidden rounded-xl border border-border bg-surface">
              {matches.map((c, i) => (
                <Pressable
                  key={c.id}
                  onPress={() => select(c)}
                  accessibilityRole="button"
                  className={[
                    'flex-row items-center px-4 py-3 hover:bg-elevated active:bg-elevated',
                    i > 0 ? 'border-t border-border' : '',
                  ].join(' ')}
                >
                  <Text className="flex-1 text-body text-ink" numberOfLines={1}>
                    {c.name}
                  </Text>
                  {c.whatsapp_number ? (
                    <Text className="text-caption text-faint">+{c.whatsapp_number}</Text>
                  ) : null}
                </Pressable>
              ))}
            </View>
          ) : null}

          {showCreate ? (
            <View className="mt-3">
              <View className="mb-2 flex-row items-center">
                <Ionicons name="sparkles-outline" size={13} color={C.accent} />
                <Text className="ml-1.5 text-caption font-semibold text-accent">
                  Cliente nuevo — falta el WhatsApp
                </Text>
              </View>
              <Input
                value={value.whatsapp}
                onChangeText={(whatsapp) => onChange({ ...value, whatsapp })}
                placeholder="11 2233 4455"
                keyboardType="phone-pad"
                prefix="+54"
              />
            </View>
          ) : null}
        </>
      )}
    </View>
  );
}
