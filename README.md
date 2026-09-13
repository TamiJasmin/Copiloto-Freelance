# Copiloto Freelance

CRM ultra-simplificado + gestor de cobros para freelancers y micro-negocios.
Presupuestar, mandar por WhatsApp y cobrar — en menos de 3 toques.

**Stack:** Expo SDK 53 (React Native 0.79 / React 19) · expo-router · NativeWind 4 (Tailwind) · Supabase.
Un solo código para iOS, Android y PWA.

---

## 1. Puesta en marcha

```bash
npm install
cp .env.example .env      # completar con las claves del proyecto Supabase
npm start                 # i = iOS, a = Android, w = web
```

> Requiere Node 20+. El proyecto está verificado con Node 24.

## 2. Base de datos

En Supabase → **SQL Editor**, pegar y ejecutar `supabase/migrations/0001_init.sql`.
Crea tablas, enums, triggers, RLS, el bucket de Storage y el RPC del dashboard.

Con Supabase CLI:

```bash
supabase link --project-ref <ref>
supabase db push
```

### Autenticación

- **Email**: magic link, activo por defecto.
- **Google**: Authentication → Providers → Google. Agregar como *Redirect URL*
  `copiloto://auth/callback` (nativo) y `http://localhost:8081` (web).

## 3. Arquitectura

```
app/                          Rutas (expo-router, file-based)
  _layout.tsx                 Providers + portero de sesión
  (auth)/login.tsx            Email magic link + Google
  (app)/index.tsx             ★ Dashboard
  (app)/quote/new.tsx         ★ Creador express
  (app)/quote/[id].tsx        Detalle + cobranza  [MVP-2]
  (app)/settings.tsx          Datos del negocio y de cobro  [MVP-2]

src/
  components/ui/              Primitivas: Button, Input, StatusPill
  components/quote/           ClientPicker, ItemsEditor
  components/dashboard/       BalanceCard, MiniStat, QuoteRow
  hooks/useSession.tsx        Sesión + perfil del usuario
  hooks/useDashboard.ts       Totales (RPC) + pendientes, con realtime
  hooks/useClients.ts         Agenda en memoria + alta de clientes
  lib/supabase.ts             Cliente único
  lib/format.ts               Moneda, fechas relativas, teléfonos E.164
  services/whatsapp.ts        Links wa.me + plantillas de mensaje
  services/pdf.ts             HTML → PDF → Storage → link firmado
  services/quotes.ts          Alta de presupuesto y flujo de envío
  theme/tokens.ts             Colores en JS (espeja tailwind.config.js)
  types/db.ts                 Tipos de las tablas

supabase/migrations/          Esquema SQL
```

**Regla de color:** los tokens viven en `tailwind.config.js`. `src/theme/tokens.ts`
los espeja para lo que Tailwind no alcanza (iconos, sombras, StatusBar).
Si cambiás uno, cambiá el otro.

## 4. Sistema de diseño

| Rol | Token | Hex |
|---|---|---|
| Fondo | `bg` | `#0A0A0B` |
| Tarjeta | `surface` | `#131316` |
| Elevado | `elevated` | `#1B1B1F` |
| Borde | `border` | `#26262B` |
| Texto | `ink` / `muted` / `faint` | `#FAFAFA` / `#8A8A93` / `#5A5A63` |
| Acento (CTA + dinero cobrado) | `accent` | `#D6FF4B` |

Estados: borrador gris · enviado ámbar · aprobado azul · **cobrado = acento**.
El acento significa una sola cosa en toda la app: *plata que entró*.

## 5. Estado del MVP

- [x] Auth (email + Google) con portero de rutas
- [x] Esquema, RLS y RPC de totales
- [x] Dashboard: cobrado vs. presupuestado, pendientes, CTA
- [x] Recordatorio de cobro por WhatsApp desde cada fila
- [x] Servicio de PDF (plantilla + subida + link firmado)
- [x] Creador de presupuestos express (cliente + ítems + enviar)
- [ ] Detalle de presupuesto y cambio de estado
- [ ] Pantalla de datos del negocio

## 6. Verificado

`npx tsc --noEmit` sin errores · `expo export` OK en web, iOS y Android.

**Límite conocido:** en la versión web `expo-print` no puede generar un archivo
para subir; abre el diálogo de impresión del navegador y el PDF se comparte a
mano. El flujo completo de envío funciona en iOS y Android.

Los parsers de base64 y de montos están probados contra casos de borde
(longitudes 0-499 y 22 formatos de número).
