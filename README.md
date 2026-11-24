# Fiados, por Predir

Control de fiados (ventas a crédito) para comercios. El comerciante:
- registra clientes;
- anota lo que le deben, en general o por apartados (Ropa, Víveres…), con interés y cuotas;
- ve el semáforo de atrasos;
- envía recordatorios por WhatsApp.

Cada cliente tiene un QR para ver lo que debe.

| Carpeta | Qué es |
|---|---|
| [`supabase/fiados_app.sql`](supabase/fiados_app.sql) | Base de datos completa (tablas, seguridad, cálculos de cuotas y semáforo). Un solo archivo. |
| [`web/`](web/) | Panel web del comerciante y portal público del cliente (`/c/<token>`). Next.js. |
| [`mobile/`](mobile/) | App móvil del comerciante. Expo (React Native). |
| `brand/` | Logos e íconos de Predir. |
| `design/` | Capturas y mockups del diseño. |
| `SPEC.md` | Especificación del producto y del diseño. |

## 1. Configurar Supabase (una sola vez)

1. Crea un proyecto en [supabase.com](https://supabase.com), usando "New project" y la región más cercana.
2. Abre **SQL Editor**, luego **New query**, pega todo el contenido de `supabase/fiados_app.sql` y presiona **Run**. Debe responder "Success". El script se ejecuta una sola vez, sobre un proyecto nuevo.
3. En **Authentication**, ve a **Providers**, luego **Email**. Para pruebas puedes desactivar "Confirm email". Si lo dejas activo, configura en **Authentication**, **URL Configuration** el dominio de la web y `http://localhost:3000`.
4. En **Project Settings**, sección **API**, copia:
   - la **Project URL**;
   - la clave pública **anon** (también llamada "publishable").

   No uses la clave `service_role` / `secret` en las apps.

Al registrarse, cada usuario crea automáticamente su negocio y queda como dueño.

## 2. Web (Next.js)

```bash
cd web
npm install
cp .env.example .env.local   # pega la URL y la clave anon
npm run dev                  # http://localhost:3000
```

Para publicarla en Vercel:
1. Importa este repositorio con **Root Directory = `web`**.
2. Agrega las variables `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` y `NEXT_PUBLIC_PORTAL_URL` (el dominio final de la web).

Más detalles en [`web/README.md`](web/README.md).

## 3. App móvil (Expo)

```bash
cd mobile
npm install
cp .env.example .env         # pega la URL, la clave anon y la URL de la web
npx expo start               # escanea el QR con Expo Go
```

Más detalles en [`mobile/README.md`](mobile/README.md).
