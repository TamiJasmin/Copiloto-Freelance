# 🐑 Lana

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
  `lana://auth/callback` (nativo) y `http://localhost:8081` (web).

## 3. Deploy en Render (PWA)

Es un **Static Site**, no un Web Service: no hay servidor que arrancar.

| Campo | Valor |
|---|---|
| Build Command | `npm ci && npx expo export -p web` |
| Publish Directory | `dist` |

Variables de entorno:

```
NODE_VERSION                   20.18.0   # Expo SDK 53 no soporta Node 22+
EXPO_PUBLIC_SUPABASE_URL       https://<ref>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY  eyJhbGci...
```

Y una regla de rewrite `/*` → `/index.html`, sin la cual recargar en
cualquier ruta que no sea la raíz devuelve 404.

Todo eso está en [`render.yaml`](render.yaml): con **New → Blueprint**
queda configurado solo y únicamente pide las dos claves de Supabase.

Después del primer deploy, en Supabase → Authentication → URL Configuration
hay que agregar la URL de Render como *Site URL* y como *Redirect URL*, o el
magic link y Google no vuelven a la app.

> La anon key viaja en el bundle del cliente. Es así por diseño: lo que
> protege los datos es la RLS, no el secreto de esa clave.

## 4. Marca

`LANA.png` en la raíz es el original de la llama. Los íconos se derivan:

```bash
npm run icons
```

Genera `assets/llama.png` (trazo blanco sobre transparente, para la app),
`icon.png`, `adaptive-icon.png`, `splash.png` y `favicon.png`.

El script recorta contra el contenido —en el original la llama ocupa el 19%
del ancho— y para los íconos aísla la cabeza, detectando el cuello como el
punto más angosto de la zona media. La llama entera es alta y angosta: en un
ícono cuadrado quedaría como una astilla.

Si cambiás `LANA.png`, volvé a correr `npm run icons` y listo.

## 5. APK de Android

Se compila en GitHub Actions: **Actions → APK de Android → Run workflow**.
Al terminar, el APK queda en *Artifacts* de esa corrida.

Antes de la primera vez hay que cargar los secretos en
**Settings → Secrets and variables → Actions**:



Sin ellos el workflow corta con un mensaje claro, en vez de entregar un APK
que compila bien y falla al abrirse.

> **Este APK no sirve para Play Store.** Expo firma el build de release con
> la clave de depuracion, asi que se instala en cualquier telefono pero
> Google lo rechaza. Para publicar hace falta un keystore propio.

El proyecto nativo (, ) no se versiona: lo genera
 en cada compilacion, asi no puede quedar desincronizado con
.

## 6. Arquitectura

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

## 7. Sistema de diseño

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

## 8. Estado del MVP

- [x] Auth (email + Google) con portero de rutas
- [x] Esquema, RLS y RPC de totales
- [x] Dashboard: cobrado vs. presupuestado, pendientes, CTA
- [x] Recordatorio de cobro por WhatsApp desde cada fila
- [x] Servicio de PDF (plantilla + subida + link firmado)
- [x] Creador de presupuestos express (cliente + ítems + enviar)
- [x] Pantalla "Mi negocio" (nombre, logo, CBU/alias)
- [x] Link publico del presupuesto (/q/<token>)
- [x] Detalle de presupuesto, cambio de estado y cobranza
- [x] Historial con busqueda y filtros
- [x] Modulo de clientes con estados derivados

## 9. Verificado

`npm test` (20 casos, sin framework) y `npx tsc --noEmit` sin errores · `expo export` OK en web, iOS y Android.

**Sobre el envío:** `wa.me` no puede adjuntar archivos — sólo acepta texto. Por
eso el mensaje lleva un link a `/q/<token>`, una página pública que muestra el
presupuesto y desde la que el cliente puede guardarlo como PDF. Funciona igual
en web, iOS y Android, sin depender del motor de impresión del dispositivo.

Los parsers de base64 y de montos están probados contra casos de borde
(longitudes 0-499 y 22 formatos de número).
