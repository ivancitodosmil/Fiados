# Fiados App: product and UI spec (shared by mobile and web)

Fiados App, made by Predir. A merchant (a "comerciante") records clients and what they owe on credit ("fiado"). Each end client gets a QR code that opens a read-only page showing what they owe.
UI language: **Spanish (Ecuador)**. Currency: **USD**, formatted `$1,234.50`. Dates: `DD/MM/YYYY`, or short `8 dic`.

## Backend (already built, do NOT change the schema)
`supabase/fiados_app.sql` is the source of truth. Read it. Summary:
- Auth: Supabase email + password. On sign-up, pass `options.data.negocio = '<business name>'`; a trigger creates the business and makes the user its owner ("dueño").
- Tables: `negocios`, `clientes` (nombres, cedula must be 10 digits or null, celular, email, direccion, fecha_nacimiento, notas, limite_credito, portal_token, portal_activo, activo), `apartados` (nombre, color, tasa_interes), `pagos` (insert directly: negocio_id, cliente_id, monto, optional deuda_id, metodo `efectivo|transferencia|tarjeta|otro`, nota, fecha), `recordatorios` (insert to log: negocio_id, cliente_id, canal `whatsapp|sms|email|otro`, mensaje).
- **Debts are created ONLY via RPC** `crear_deuda` (no direct inserts on deudas or cuotas). Read before writing: `simular_deuda` for the preview.
  - `simular_deuda({p_negocio, p_capital, p_tasa_interes?, p_apartado?, p_fecha_inicio?, p_fecha_fin?, p_frecuencia?, p_num_cuotas?, p_primer_vencimiento?, p_excluir_domingos?})` returns `{capital, tasa_interes, interes, total, fecha_inicio, num_cuotas, valor_cuota, cuotas:[{numero, vence, monto}]}`.
  - `crear_deuda({p_cliente, p_capital, p_descripcion?, p_apartado?, p_tasa_interes?, p_fecha_inicio?, p_fecha_fin?, p_frecuencia?, p_num_cuotas?, p_primer_vencimiento?, p_excluir_domingos?})` returns the deuda id.
  - `p_frecuencia`: `diaria|semanal|quincenal|mensual`. `p_tasa_interes` null means use the apartado's default rate.
  - Three plan modes in the UI: **Pago único** (one due date, default fecha + dias_credito), **Por fechas** (inicio + fin + frecuencia; the last installment falls on fecha fin), **Número de cuotas** (N + frecuencia).
- Read-only views (the semáforo is computed in SQL): `v_clientes_resumen` (saldo_total, total_vencido, cuotas_vencidas, dias_mora, dias_deuda, proximo_vencimiento, credito_disponible, semaforo `verde|amarillo|rojo`, portal_token), `v_deudas` (per debt: apartado, capital, interes, monto, pagado, saldo, cuotas_vencidas, dias_atraso, semaforo), `v_cuotas` (numero, monto, pagado, saldo, fecha_vencimiento, dias_atraso, estado `pagada|vencida|por_vencer|al_dia`, semaforo), `v_saldo_por_apartado`, `v_dashboard` (total_por_cobrar, total_vencido, clientes_con_deuda, clientes_rojo, clientes_amarillo, cobrado_mes).
- Payments auto-apply to the oldest installment. Overpaying raises an error; show it to the user.
- Deleting a payment reverts it. A debt that has payments cannot be deleted or annulled (`update deudas set anulada = true`); the SQL error message is user-facing Spanish, show it.
- `generar_recordatorio({p_cliente, p_url_base})` returns `{mensaje, celular, email, semaforo, total}`. The WhatsApp button opens `https://wa.me/593<celular without leading 0>?text=<encodeURIComponent(mensaje)>` (Ecuador; if the number already starts with 593 keep it), then inserts a `recordatorios` row.
- `regenerar_qr({p_cliente})` returns a new token.
- Public QR portal: `rpc('portal_cliente', {p_token})` works with the anon key and returns `{negocio, cliente, resumen, apartados, deudas:[...cuotas], pagos}`, or null when the token is invalid.
- QR URL: `${PORTAL_BASE_URL}/c/${portal_token}`. The web app serves this page.
- Errors come back as PostgrestError `.message`, already in Spanish. Surface them in a toast or inline.

## Config / env
- Mobile: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_PORTAL_URL`.
- Web: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_PORTAL_URL`.
- Ship a `.env.example`. The user sends real values later. Without env vars the app must not crash: show a clear "Configura Supabase" screen.

## Brand (Predir manual: predirsoft.com/marca)
| token | hex | use |
|---|---|---|
| verde (primary) | #2F6D5F | primary buttons, active tab, links, headings accents |
| verde-claro | #9FD3C5 | soft surfaces, chips, selected states, illustrations |
| tinta (ink) | #18282A | text, dark surfaces (hero card on dashboard) |
| coral | #E8836B | small accents and brand "d" only; never text on light bg |
| papel | #F4F8F6 | app background (white + hint of verde-claro) |
| blanco | #FFFFFF | cards, sheets, inputs |
Neutral greys are derived from tinta (e.g. #5B6B6C secondary text, #E3EAE7 borders).
Semáforo colors are separate from the brand and must be clear: verde `#1E9E6A` / bg `#E3F5EC`, amarillo `#D99A00` / bg `#FFF4D6`, rojo `#D64545` / bg `#FDE7E7`. Always pair color with a label ("Al día", "Por vencer", "Vencido"), never color alone.
Fonts: **Poppins** 600 for headings and big numbers (tabular figures for money), **Geist** 400/500 for body and UI (Geist Mono for small labels is optional).
Assets in `brand/`: `logo-horizontal-color-recorte.png` (Predir logo for light bg), `logo-horizontal-blanco-recorte.png` (for dark bg), `icono-app-verde.svg`, `favicon.svg`, `favicon-192.png`. The product name is "Fiados", with a small "por Predir" tag using the logo.

## Design principles
Easy for a shopkeeper who is not tech-savvy: large tap targets (≥48px), one primary action per screen, money amounts large and legible, white cards on the papel background, generous spacing, no clutter, no gradients, no glassmorphism. Motion is subtle and purposeful (press feedback, sheet transitions) and respects reduced motion.

## Screens (merchant)
1. **Login / Registro**: email, password, business name (sign-up only).
2. **Inicio (dashboard)**: dark tinta hero card "Por cobrar $X" with "Vencido $Y" in rojo; counters (clientes en rojo, amarillo); "Cobrado este mes"; list "Requieren atención" (red clients first, sorted by dias_mora desc) with a quick WhatsApp button.
3. **Clientes**: search by name or cédula; filter chips Todos / Vencidos / Por vencer / Al día; each row shows the name, saldo, semáforo pill and días de mora. FAB "+ Cliente".
4. **Nuevo / Editar cliente**: nombres*, cédula (validate 10 digits), celular, email, dirección, fecha nacimiento, límite de crédito, notas.
5. **Detalle cliente**: header with saldo total + semáforo + días debiendo; balance per apartado; list of debts (expandable to installments with status pills); recent payments. Actions: **Nuevo fiado**, **Registrar pago**, **Enviar recordatorio (WhatsApp)**, **Ver QR** (show QR, share link, regenerate), edit, deactivate.
6. **Nuevo fiado**: amount, description, apartado (choosing one prefills its interest), interest % (editable), plan mode (Pago único / Por fechas / Número de cuotas), frecuencia selector, "No cobrar domingos" toggle. **Live preview** via simular_deuda (debounced): capital, + interés, = total, N cuotas × $valor, and a list of due dates. Confirm button "Guardar fiado".
7. **Registrar pago**: amount (with a quick "Pagar cuota vencida" / "Pagar todo" fill), method, optional debt, note.
8. **Ajustes**: business data (nombre, teléfono, logo_url), dias_credito, dias_aviso, editable reminder template with placeholders {cliente} {negocio} {total} {detalle} {link}; manage apartados (name, color, default interest %); sign out.

## Public portal (web only): `/c/[token]`
Mobile-first, read-only, no login. Business name and logo, client first name, big saldo total, semáforo, total vencido, días de mora, balance per apartado, debts with installment timeline, recent payments, "Contactar por WhatsApp" to the business phone. Invalid token: friendly "Enlace no válido".

## CHOSEN VISUAL DIRECTION: Option C, "Suave y amable" (client approved)
Reference: `design/mockups.html?d=C` (open its source for exact CSS) and the renders `design/opcion-C-app.png` / `design/opcion-C-web.png`. Match them closely.
- Screen background **white** (#FFFFFF); the web main area uses papel #F4F8F6 with a white sidebar.
- Cards: white, **no border**, radius 24, soft shadow `0 1px 2px rgba(24,40,42,.05), 0 6px 20px -8px rgba(24,40,42,.12)`.
- Key summary surfaces ("Por cobrar" hero, client "Debe en total", fiado preview) use the soft green surface **#E6F3EF**, radius 24, no shadow.
- Buttons are **pill-shaped** (fully rounded), height 48–52. Primary: verde #2F6D5F with white text. Secondary: white with a #E3EAE7 border.
- Avatars: **circles**, tinta #18282A background, white Poppins initials.
- Semáforo pills: small rounded pills with a dot, colors as listed above.
- Segmented controls: #E9F0ED track with a white selected segment. Chips: white with a border; selected chip uses a tinta background with white text.
- Dashboard greeting "Hola, <name> 👋" with the business name as the title; the hero shows a big amount with the cents smaller and grey, plus a red progress bar for the vencido share.
- WhatsApp quick button: 40px rounded square, background #E7F6EE, green WhatsApp glyph.
- Mobile tab bar: white, no top border, soft upward shadow. Tabs: Inicio, Clientes, Cobros, Ajustes.

## REVISION 1 (client feedback, 2026-11-22): replaces the semáforo pill rules above
The client said the pastel "pill + dot" status chips and the "·" separators look generic and AI-made. New rules for BOTH apps:
1. **No middle-dot separators anywhere in the UI.** Remove every "·" (and similar " • " or " | " joiners) from visible text. Show the parts as separate elements: two lines, separate columns, a label above a value, or natural Spanish ("Vencido hace 17 días", "CI 1712345678" on its own line and the phone on another).
2. **Semáforo v2: solid, decisive status tags.** Drop the pastel background, the dot and the fully-rounded pill.
   - Shape: radius 6, height 22–24, horizontal padding 8. Text is Geist 600, 11–12px, UPPERCASE, letter-spacing .04em.
   - VENCIDO: background #C62828, white text.
   - POR VENCER: background #F2B705, text #18282A.
   - AL DÍA: background #2F6D5F (brand green), white text.
   - PAGADA (installments): no fill; 1px #CFDAD6 border, text #5B6B6C.
   - The day count is NOT inside the tag. Show it next to or under it as plain text in #5B6B6C, e.g. "17 días de atraso", "vence en 2 días", "vence el 15 dic".
   - Money that is overdue: text color #C62828. Amber text (on white) uses #8A6100 for contrast.
3. **Rows and cards for clients and debts get a 3px left accent bar in the status color.** Cards: inside the left edge, full height, rounded with the card. Avatars stay neutral, with no colored rings.
4. Progress bars and charts use the same three status colors (#C62828 / #F2B705 / #2F6D5F) on a #E9F0ED track.

## REVISION 2 (client feedback): replaces REVISION 1, rule 3
The client says the colored left accent bars look AI-made. **Remove every left accent bar or border** from rows, table rows, cards, debt cards, installments and portal cards, in both apps. Do not replace them with another decorative color edge, ring or stripe. Status is shown only by the solid status tag and the red overdue amount. Group rows cleanly with plain dividers and spacing; red clients already sort first.
