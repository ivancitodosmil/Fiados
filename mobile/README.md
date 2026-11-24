# Fiados · app móvil (comerciante)

App de Expo (React Native + Expo Router + TypeScript) para que el comerciante registre clientes, fiados, cuotas y pagos, envíe recordatorios por WhatsApp y muestre el QR del portal del cliente. Usa el backend de Supabase en `../supabase/fiados_app.sql`.

El portal público del QR (`/c/<token>`) **no** está en esta app: lo sirve el proyecto web (`../web`).

## Requisitos

- Node LTS (con nvm: `nvm use --lts`)
- Un proyecto de Supabase con `fiados_app.sql` ya ejecutado
- En el teléfono: **Expo Go** (Android / iOS) para probar en desarrollo

## Configuración

```bash
cd mobile
npm install
cp .env.example .env   # y completa los valores
```

| Variable | Qué es |
|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | URL del proyecto (Supabase → Project Settings → API) |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Clave pública `anon` del mismo lugar |
| `EXPO_PUBLIC_PORTAL_URL` | URL pública de la web, sin barra final (ej. `https://fiados.tudominio.com`). Se usa para el QR (`/c/<token>`) y el enlace dentro del recordatorio |

Si faltan las variables de Supabase, la app muestra la pantalla **"Configura Supabase"** en lugar de fallar. Las variables `EXPO_PUBLIC_*` se incrustan al compilar: después de cambiarlas reinicia con `npx expo start --clear` (o vuelve a compilar).

> En Supabase → Authentication → Providers → Email puedes desactivar "Confirm email" para que el registro entre directo. Si está activo, la app avisa al comerciante que revise su correo.

## Desarrollo con Expo Go

```bash
npx expo start
```

Escanea el QR de la terminal con la cámara (iOS) o con Expo Go (Android). Teléfono y computadora deben estar en la misma red (si no, `npx expo start --tunnel`).

Comprobaciones:

```bash
npx tsc --noEmit
npx expo-doctor
```

## Compilar con EAS (Android / iOS)

```bash
npm install -g eas-cli      # o usa: npx eas-cli@latest <comando>
eas login
eas build:configure         # crea eas.json la primera vez
```

Las variables de entorno se configuran en EAS (no se sube el `.env`):

```bash
eas env:create --name EXPO_PUBLIC_SUPABASE_URL --value https://xxxx.supabase.co --environment production --visibility plaintext
eas env:create --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value <anon-key> --environment production --visibility plaintext
eas env:create --name EXPO_PUBLIC_PORTAL_URL --value https://fiados.tudominio.com --environment production --visibility plaintext
```

Compilar:

```bash
eas build --platform android --profile preview      # APK para instalar directo
eas build --platform android --profile production   # AAB para Google Play
eas build --platform ios --profile production       # requiere cuenta de Apple Developer
```

Publicar en las tiendas: `eas submit --platform android` / `eas submit --platform ios`.
Actualizaciones de solo JavaScript sin pasar por la tienda: `eas update`.

Identificadores (en `app.json`): Android `com.predir.fiados`, iOS `com.predir.fiados`. Cámbialos antes de la primera publicación si hace falta.

## Despliegue: separado de la web

- La **app móvil** se distribuye por EAS / tiendas (o APK). No depende del hosting de la web.
- La **web** (`../web`, Next.js) se despliega por su cuenta (p. ej. Vercel) y es la que sirve el portal `/c/<token>`.
- Ambas usan el **mismo proyecto de Supabase**. Lo único que las une es `EXPO_PUBLIC_PORTAL_URL`, que debe apuntar al dominio donde quedó publicada la web.

## Estructura

```
src/app/            rutas (Expo Router)
  (auth)/           login, registro
  (tabs)/           Inicio, Clientes, Cobros, Ajustes
  cliente/          nuevo, [id] (detalle), [id]/editar, [id]/qr
  fiado/nuevo       nuevo fiado con vista previa (simular_deuda)
  pago/nuevo        registrar pago
  apartado          crear / editar apartado
src/components/     UI compartida (botones, tarjetas, pills del semáforo, formularios)
src/lib/            supabase, sesión, formato de dinero y fechas, toasts, recordatorios
```
