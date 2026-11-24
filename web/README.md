# Fiados · web (por Predir)

Panel web del comerciante y portal público del cliente (`/c/<token>`), hecho con Next.js (App Router), Tailwind y Supabase.

## Requisitos

- Node.js 20 o superior
- Un proyecto de Supabase con el script `../supabase/fiados_app.sql` ya ejecutado (SQL Editor → pegar → Run)

## Configuración

1. Instala las dependencias:

   ```bash
   npm install
   ```

2. Copia el archivo de ejemplo y completa los valores:

   ```bash
   cp .env.example .env.local
   ```

   | Variable | Qué es |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto (Supabase → Project Settings → API) |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave pública `anon` del mismo lugar |
   | `NEXT_PUBLIC_PORTAL_URL` | Dominio público de esta web, p. ej. `https://fiados.tudominio.com`. Se usa en el QR y en el enlace de los recordatorios (`<PORTAL_URL>/c/<token>`). Si falta, se usa el dominio actual del navegador. |

   Son variables `NEXT_PUBLIC_*`: se incrustan al compilar, así que después de cambiarlas hay que volver a ejecutar `npm run build` (o reiniciar `npm run dev`). Si faltan, la app muestra la pantalla «Configura Supabase» en lugar de fallar.

3. En Supabase → Authentication → URL Configuration, agrega tu dominio (y `http://localhost:3000` para pruebas) en **Site URL / Redirect URLs**, para que funcione el correo de confirmación del registro.

## Desarrollo

```bash
npm run dev      # http://localhost:3000
npm run lint
npm run build && npm start
```

## Rutas

| Ruta | Pantalla |
|---|---|
| `/login` | Ingresar y crear cuenta (el registro envía el nombre del negocio en `options.data.negocio`) |
| `/inicio` | Resumen: por cobrar, vencido, por vencer, cobrado del mes y clientes que requieren atención |
| `/clientes` | Lista con búsqueda (nombre o cédula) y filtros Todos / Vencidos / Por vencer / Al día |
| `/clientes/nuevo`, `/clientes/[id]/editar` | Crear y editar cliente |
| `/clientes/[id]` | Detalle: saldo, apartados, fiados con cuotas, pagos, recordatorio por WhatsApp, QR |
| `/fiado?cliente=<id>` | Nuevo fiado con vista previa en vivo (`simular_deuda`) |
| `/cobros` y `/cobros?cliente=<id>` | Registrar pago y últimos pagos |
| `/apartados` | Apartados (también dentro de Ajustes) |
| `/ajustes` | Datos del negocio, días de crédito y aviso, plantilla del recordatorio, apartados, cerrar sesión |
| `/c/[token]` | Portal público del cliente (sin login, solo lectura) |

## Publicar en Vercel

1. Sube la carpeta del proyecto a GitHub (o usa `npx vercel`).
2. En Vercel → **Add New Project**, importa el repositorio y en **Root Directory** elige `web`.
3. En **Settings → Environment Variables** agrega `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` y `NEXT_PUBLIC_PORTAL_URL` (con el dominio final de Vercel o el tuyo).
4. Pulsa **Deploy**. Si cambias una variable después, vuelve a desplegar (Deployments → Redeploy) para que se apliquen.
5. Agrega el dominio de Vercel en las Redirect URLs de Supabase (paso 3 de Configuración).

## Notas

- La sesión se guarda en el navegador (localStorage) con `@supabase/supabase-js`; todo el panel se dibuja del lado del cliente.
- Los mensajes de error de Supabase ya vienen en español y se muestran tal cual en avisos.
- El recordatorio abre `https://wa.me/593…` con el mensaje de `generar_recordatorio` y luego registra el envío en la tabla `recordatorios`.
