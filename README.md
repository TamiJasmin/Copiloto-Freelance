# 🦙 Lana

> **Tu trabajo vale lana.**

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

`LANA.png` en la raíz es el original: un imagotipo con la llama arriba y la
palabra LANA debajo. Los íconos se derivan de ahí:

```bash
npm run icons
```

| Archivo generado | Uso |
|---|---|
| `llama.png` | Sólo el animal, trazo blanco sobre transparente |
| `lockup.png` | El imagotipo completo — pantalla de ingreso |
| `icon.png` | Tiendas. Fondo opaco: iOS no admite transparencia |
| `adaptive-icon.png` | Android, con margen para el recorte circular |
| `splash.png` | Pantalla de carga |
| `favicon.png` | Pestaña del navegador |

El script recorta contra el contenido —en el original la llama ocupa el 17%
del ancho— y parte el logo por la banda de filas vacías que separa el dibujo
de la palabra. Para los íconos usa sólo la llama: a 48px en la grilla del
teléfono, la palabra sería una mancha.

Si cambiás `LANA.png`, volvé a correr `npm run icons`. Si el logo deja de
tener dos bloques, el script corta con un mensaje en vez de publicar íconos
mal recortados.

## 5. APK de Android

Se compila en GitHub Actions: **Actions → APK de Android → Run workflow**.
Al terminar, el APK queda en *Artifacts* de esa corrida.

Antes de la primera vez hay que cargar los secretos en
**Settings → Secrets and variables → Actions**:

```
EXPO_PUBLIC_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_ANON_KEY
EXPO_PUBLIC_APP_URL
```

Sin ellos el workflow corta con un mensaje claro, en vez de entregar un APK
que compila bien y falla al abrirse.

> **Este APK no sirve para Play Store.** Expo firma el build de release con
> la clave de depuracion, asi que se instala en cualquier telefono pero
> Google lo rechaza. Para publicar hace falta un keystore propio.

El proyecto nativo (`android/`, `ios/`) no se versiona: lo genera
`expo prebuild` en cada compilación, así no puede quedar desincronizado con
`app.json`.

## 6. Arquitectura

```
app/                          Rutas (expo-router, file-based)
  _layout.tsx                 Providers + portero de sesión
  (auth)/login.tsx            Contraseña, link de acceso y Google
  (app)/index.tsx             ★ Dashboard, ordenado por urgencia
  (app)/quote/new.tsx         Alta  (?from=<id> arranca de una plantilla)
  (app)/quote/[id].tsx        Detalle, estados y cobranza
  (app)/edit/[id].tsx         Edición de ítems y vencimiento
  (app)/quotes.tsx            Historial con búsqueda y filtros
  (app)/clients.tsx           Agenda con estados derivados
  (app)/settings.tsx          Mi negocio: datos de cobro y contraseña
  q/[token].tsx               ★ Lo que ve el cliente. Sin sesión

src/
  components/ui/              Button, Input, Screen, SearchBar,
                              FilterChips, ConfirmDialog, StatusPill,
                              LlamaMark
  components/quote/           ClientPicker, ItemsEditor, ValidityPicker,
                              QuoteForm (compartido por alta y edición)
  components/dashboard/       BalanceCard, MiniStat, QuoteRow,
                              AttentionCard
  hooks/useSession.tsx        Sesión + perfil del usuario
  hooks/useDashboard.ts       Totales (RPC), pendientes y urgencias
  hooks/useQuotes.ts          Historial con filtros, y un presupuesto suelto
  hooks/useClients.ts         Agenda en memoria + alta de clientes
  hooks/useClientsOverview.ts Agenda con agregados y estados derivados
  lib/quoteState.ts           ★ Estados derivados y orden de urgencia
  lib/format.ts               Moneda, fechas, teléfonos E.164
  lib/errors.ts               Traduce los errores de Supabase
  lib/share.ts                Links públicos de presupuesto
  lib/nav.ts                  Cierre de pantalla con vuelta al inicio
  services/whatsapp.ts        Links wa.me y plantillas de mensaje
  services/pdf.ts             Documento HTML del presupuesto
  services/quotes.ts          Alta, edición, estados y envío

scripts/generar-iconos.js     Íconos desde LANA.png
supabase/migrations/          Esquema SQL, en orden
```

**Estados derivados.** Los cuatro estados de tiempo —sin respuesta, por
vencer, vencido y moroso— NO se guardan: se calculan al mirarlos, en
[`lib/quoteState.ts`](src/lib/quoteState.ts). Guardarlos exigiría un proceso
que los fuera cambiando y entre corridas mostrarían algo falso, como un
presupuesto al día el día después de vencer.

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
- [x] Usar un presupuesto como plantilla
- [x] Aceptar el presupuesto desde el link del cliente
- [x] Pagar o copiar el alias desde la pagina del presupuesto
- [x] Link de pago con monto exacto, por presupuesto
- [x] APK de Android desde GitHub Actions

Pendiente: generar el link de MP automaticamente (requiere Edge Function),
seña y pagos parciales, recordatorios automáticos, exportar para el contador.

## 9. Verificado

```bash
npm test            # 50 casos, sin framework ni dependencias
npx tsc --noEmit    # sin errores
npx expo export     # OK en web, iOS y Android
```

Los tests cubren la aritmética de ítems, los estados derivados, el orden de
urgencia y el cálculo de fechas. Son las funciones que ya escondieron bugs
reales: "150.000" leído como 150, el precio cargado en el campo de cantidad y
un error de redondeo que hacía inalcanzables dos estados.

**Sobre el envío:** `wa.me` no puede adjuntar archivos — sólo acepta texto. Por
eso el mensaje lleva un link a `/q/<token>`, una página pública que muestra el
presupuesto y desde la que el cliente puede guardarlo como PDF. Funciona igual
en web, iOS y Android, sin depender del motor de impresión del dispositivo.

Los parsers de base64 y de montos están probados contra casos de borde
(longitudes 0-499 y 22 formatos de número).
