-- =====================================================================
--  FIADOS APP · Base de datos completa para Supabase (PostgreSQL 15+)
--  Cómo usarlo: Supabase → SQL Editor → New query → pegar todo → Run.
--  Ejecutar UNA vez sobre un proyecto nuevo.
-- =====================================================================
--  Modelo:
--   negocios ─┬─ negocio_miembros (usuarios del comercio: dueño/empleado)
--             ├─ clientes ── deudas ── cuotas   (pago único = 1 cuota)
--             ├─ apartados (categorías para segmentar la deuda)
--             ├─ pagos ── pago_aplicaciones (a qué cuotas se aplicó)
--             └─ recordatorios (historial de mensajes enviados)
--  Semáforo por cuota:  verde = al día · amarillo = vence en ≤ dias_aviso
--                       rojo = vencida con saldo
-- =====================================================================

-- gen_random_uuid() viene incluido en PostgreSQL 13+ (no requiere extensiones)

-- ---------------------------------------------------------------------
-- 1. TABLAS
-- ---------------------------------------------------------------------

create table public.negocios (
  id                      uuid primary key default gen_random_uuid(),
  nombre                  text not null,
  telefono                text,
  email                   text,
  direccion               text,
  logo_url                text,
  moneda                  text not null default 'USD',
  simbolo                 text not null default '$',
  zona_horaria            text not null default 'America/Guayaquil',
  dias_credito            int  not null default 30 check (dias_credito between 1 and 365),
  dias_aviso              int  not null default 3  check (dias_aviso between 0 and 60),
  plantilla_recordatorio  text not null default
    'Hola {cliente}, te saluda {negocio}. Tu saldo pendiente es {total}. {detalle} Puedes ver tu detalle aquí: {link} ¡Gracias!',
  created_by              uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create table public.negocio_miembros (
  negocio_id  uuid not null references public.negocios(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  rol         text not null default 'empleado' check (rol in ('dueno','empleado')),
  created_at  timestamptz not null default now(),
  primary key (negocio_id, user_id)
);

create table public.clientes (
  id              uuid primary key default gen_random_uuid(),
  negocio_id      uuid not null references public.negocios(id) on delete cascade,
  nombres         text not null check (length(trim(nombres)) > 0),
  cedula          text check (cedula is null or cedula ~ '^[0-9]{10}$'),  -- 10 dígitos
  celular         text,
  email           text,
  direccion       text,
  fecha_nacimiento date,
  foto_url        text,
  notas           text,
  limite_credito  numeric(12,2) check (limite_credito is null or limite_credito >= 0),
  portal_token    uuid not null unique default gen_random_uuid(),  -- va dentro del QR
  portal_activo   boolean not null default true,
  activo          boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (id, negocio_id)
);
create unique index clientes_cedula_uk on public.clientes (negocio_id, cedula) where cedula is not null;
create index clientes_negocio_idx on public.clientes (negocio_id, nombres);

create table public.apartados (
  id          uuid primary key default gen_random_uuid(),
  negocio_id  uuid not null references public.negocios(id) on delete cascade,
  nombre        text not null,
  color         text,
  tasa_interes  numeric(6,2) not null default 0 check (tasa_interes between 0 and 1000), -- % por defecto
  created_at  timestamptz not null default now(),
  unique (negocio_id, nombre),
  unique (id, negocio_id)
);

create table public.deudas (
  id           uuid primary key default gen_random_uuid(),
  negocio_id   uuid not null references public.negocios(id) on delete cascade,
  cliente_id   uuid not null,
  apartado_id  uuid,                           -- null = deuda "General"
  descripcion  text,
  capital      numeric(12,2) not null check (capital > 0),          -- lo fiado
  tasa_interes numeric(6,2)  not null default 0 check (tasa_interes >= 0),  -- % fijo sobre el capital
  interes      numeric(12,2) not null default 0 check (interes >= 0),
  monto        numeric(12,2) not null check (monto > 0),            -- total a pagar = capital + interés
  fecha        date not null,                                       -- fecha de inicio
  fecha_fin    date,
  modalidad    text not null check (modalidad in ('unico','cuotas')),
  num_cuotas   int  not null default 1 check (num_cuotas between 1 and 400),
  frecuencia   text check (frecuencia in ('diaria','semanal','quincenal','mensual')),
  excluir_domingos boolean not null default false,
  anulada      boolean not null default false,
  created_by   uuid default auth.uid(),
  created_at   timestamptz not null default now(),
  unique (id, negocio_id),
  foreign key (cliente_id, negocio_id) references public.clientes(id, negocio_id) on delete cascade,
  foreign key (apartado_id, negocio_id) references public.apartados(id, negocio_id) on delete set null (apartado_id)
);
create index deudas_cliente_idx on public.deudas (cliente_id);

create table public.cuotas (
  id                 uuid primary key default gen_random_uuid(),
  negocio_id         uuid not null,
  deuda_id           uuid not null,
  numero             int  not null,
  monto              numeric(12,2) not null check (monto > 0),
  pagado             numeric(12,2) not null default 0,
  fecha_vencimiento  date not null,
  check (pagado >= 0 and pagado <= monto),
  unique (deuda_id, numero),
  foreign key (deuda_id, negocio_id) references public.deudas(id, negocio_id) on delete cascade
);
create index cuotas_deuda_idx on public.cuotas (deuda_id);
create index cuotas_pendientes_idx on public.cuotas (negocio_id, fecha_vencimiento) where pagado < monto;

create table public.pagos (
  id          uuid primary key default gen_random_uuid(),
  negocio_id  uuid not null references public.negocios(id) on delete cascade,
  cliente_id  uuid not null,
  deuda_id    uuid,                            -- null = se aplica a lo más antiguo
  monto       numeric(12,2) not null check (monto > 0),
  fecha       date not null default current_date,
  metodo      text not null default 'efectivo' check (metodo in ('efectivo','transferencia','tarjeta','otro')),
  nota        text,
  created_by  uuid default auth.uid(),
  created_at  timestamptz not null default now(),
  foreign key (cliente_id, negocio_id) references public.clientes(id, negocio_id) on delete cascade,
  foreign key (deuda_id, negocio_id) references public.deudas(id, negocio_id) on delete cascade
);
create index pagos_cliente_idx on public.pagos (cliente_id, fecha desc);
create index pagos_negocio_idx on public.pagos (negocio_id, fecha);

create table public.pago_aplicaciones (
  id          bigint generated always as identity primary key,
  negocio_id  uuid not null references public.negocios(id) on delete cascade,
  pago_id     uuid not null references public.pagos(id) on delete cascade,
  cuota_id    uuid not null references public.cuotas(id) on delete cascade,
  monto       numeric(12,2) not null check (monto > 0)
);
create index pago_apl_pago_idx on public.pago_aplicaciones (pago_id);

create table public.recordatorios (
  id          uuid primary key default gen_random_uuid(),
  negocio_id  uuid not null references public.negocios(id) on delete cascade,
  cliente_id  uuid not null,
  canal       text not null check (canal in ('whatsapp','sms','email','otro')),
  mensaje     text not null,
  created_by  uuid default auth.uid(),
  created_at  timestamptz not null default now(),
  foreign key (cliente_id, negocio_id) references public.clientes(id, negocio_id) on delete cascade
);
create index recordatorios_cliente_idx on public.recordatorios (cliente_id, created_at desc);

-- ---------------------------------------------------------------------
-- 2. FUNCIONES DE APOYO
-- ---------------------------------------------------------------------

create or replace function public.es_miembro(p_negocio uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from negocio_miembros
                 where negocio_id = p_negocio and user_id = auth.uid());
$$;

create or replace function public.es_dueno(p_negocio uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from negocio_miembros
                 where negocio_id = p_negocio and user_id = auth.uid() and rol = 'dueno');
$$;

create or replace function public.fmt_dinero(p_valor numeric, p_simbolo text)
returns text language sql immutable as $$
  select coalesce(p_simbolo, '$') || trim(to_char(coalesce(p_valor, 0), 'FM999,999,999,990.00'));
$$;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;

create trigger negocios_updated_at before update on public.negocios
  for each row execute function public.set_updated_at();
create trigger clientes_updated_at before update on public.clientes
  for each row execute function public.set_updated_at();

-- El creador de un negocio queda como dueño.
create or replace function public.trg_negocio_dueno()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into negocio_miembros (negocio_id, user_id, rol)
  values (new.id, new.created_by, 'dueno')
  on conflict do nothing;
  return new;
end $$;
create trigger negocios_dueno after insert on public.negocios
  for each row execute function public.trg_negocio_dueno();

-- Al registrarse un usuario se le crea su negocio.
-- (En el registro se puede enviar options.data.negocio = 'Tienda Don Pepe')
create or replace function public.trg_nuevo_usuario()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into negocios (nombre, email, created_by)
  values (coalesce(nullif(trim(new.raw_user_meta_data->>'negocio'), ''), 'Mi negocio'), new.email, new.id);
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.trg_nuevo_usuario();

-- ---------------------------------------------------------------------
-- 3. LÓGICA DE DEUDAS Y PAGOS
-- ---------------------------------------------------------------------

-- Calcula el plan de cuotas (fechas y montos). No guarda nada.
--   Con p_fin:   un abono cada p_frecuencia desde p_inicio; la última cuota cae en p_fin.
--   Sin p_fin:   p_num_cuotas = 1 → un solo pago en p_inicio + p_dias_credito (o p_primer)
--                p_num_cuotas > 1 → N cuotas desde p_primer (o p_inicio + 1 periodo)
--   p_excluir_domingos: en diario se saltan los domingos; en el resto pasan al lunes.
--   La última cuota absorbe los centavos del redondeo.
create or replace function public.plan_cuotas(
  p_total             numeric,
  p_inicio            date,
  p_fin               date    default null,
  p_frecuencia        text    default null,
  p_num_cuotas        int     default 1,
  p_primer            date    default null,
  p_excluir_domingos  boolean default false,
  p_dias_credito      int     default 30
) returns table (numero int, fecha_vencimiento date, monto numeric)
language plpgsql stable set search_path = public as $$
declare
  v_paso   interval;
  v_fechas date[] := '{}';
  v_base   date;
  d        date;
  k        int := 0;
  n        int;
  v_cuota  numeric(12,2);
  i        int;
begin
  if p_total is null or p_total <= 0 then raise exception 'El monto debe ser mayor a 0'; end if;
  if p_inicio is null then raise exception 'Falta la fecha de inicio'; end if;
  if p_fin is not null and p_fin <= p_inicio then
    raise exception 'La fecha fin debe ser posterior a la fecha de inicio';
  end if;

  v_paso := case p_frecuencia
              when 'diaria'    then interval '1 day'
              when 'semanal'   then interval '7 days'
              when 'quincenal' then interval '15 days'
              when 'mensual'   then interval '1 month' end;
  if p_frecuencia is not null and v_paso is null then
    raise exception 'Frecuencia inválida (diaria, semanal, quincenal, mensual)';
  end if;

  if p_fin is not null then
    if v_paso is not null then
      loop
        k := k + 1;
        d := (p_inicio + v_paso * k)::date;
        exit when d >= p_fin;
        if coalesce(p_excluir_domingos, false) and extract(isodow from d) = 7 then
          if p_frecuencia = 'diaria' then continue; end if;
          d := d + 1;
          exit when d >= p_fin;
        end if;
        v_fechas := v_fechas || d;
        if cardinality(v_fechas) >= 400 then raise exception 'Demasiadas cuotas (máximo 400)'; end if;
      end loop;
    end if;
    v_fechas := v_fechas || p_fin;

  elsif coalesce(p_num_cuotas, 1) = 1 then
    v_fechas := array[coalesce(p_primer, p_inicio + coalesce(p_dias_credito, 30))];

  else
    if p_num_cuotas > 400 then raise exception 'Demasiadas cuotas (máximo 400)'; end if;
    v_paso := coalesce(v_paso, interval '1 month');
    v_base := coalesce(p_primer, (p_inicio + v_paso)::date);
    while cardinality(v_fechas) < p_num_cuotas loop
      d := (v_base + v_paso * k)::date;
      k := k + 1;
      if coalesce(p_excluir_domingos, false) and extract(isodow from d) = 7 then
        if coalesce(p_frecuencia, 'mensual') = 'diaria' then continue; end if;
        d := d + 1;
      end if;
      v_fechas := v_fechas || d;
    end loop;
  end if;

  n := cardinality(v_fechas);
  v_cuota := trunc(round(p_total, 2) / n, 2);
  if v_cuota <= 0 then raise exception 'El monto es muy pequeño para % cuotas', n; end if;

  for i in 1..n loop
    numero := i;
    fecha_vencimiento := v_fechas[i];
    monto := case when i = n then round(p_total, 2) - v_cuota * (n - 1) else v_cuota end;
    return next;
  end loop;
end $$;

-- VISTA PREVIA para la app antes de guardar (capital, interés, total, cuotas).
--   p_tasa_interes null → usa el interés por defecto del apartado (o 0).
create or replace function public.simular_deuda(
  p_negocio           uuid,
  p_capital           numeric,
  p_tasa_interes      numeric default null,
  p_apartado          uuid    default null,
  p_fecha_inicio      date    default null,
  p_fecha_fin         date    default null,
  p_frecuencia        text    default null,
  p_num_cuotas        int     default 1,
  p_primer_vencimiento date   default null,
  p_excluir_domingos  boolean default false
) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_neg     negocios%rowtype;
  v_tasa    numeric;
  v_interes numeric(12,2);
  v_total   numeric(12,2);
  v_inicio  date;
  v_cuotas  jsonb;
begin
  if not es_miembro(p_negocio) then raise exception 'Negocio no encontrado'; end if;
  select * into v_neg from negocios where id = p_negocio;

  if p_capital is null or p_capital <= 0 then raise exception 'El monto debe ser mayor a 0'; end if;
  v_tasa := coalesce(p_tasa_interes,
                     (select tasa_interes from apartados where id = p_apartado and negocio_id = p_negocio),
                     0);
  if v_tasa < 0 or v_tasa > 1000 then raise exception 'Interés inválido'; end if;

  v_interes := round(p_capital * v_tasa / 100, 2);
  v_total   := round(p_capital, 2) + v_interes;
  v_inicio  := coalesce(p_fecha_inicio, (now() at time zone v_neg.zona_horaria)::date);

  select jsonb_agg(jsonb_build_object('numero', numero, 'vence', fecha_vencimiento, 'monto', monto) order by numero)
    into v_cuotas
    from plan_cuotas(v_total, v_inicio, p_fecha_fin, p_frecuencia, p_num_cuotas,
                     p_primer_vencimiento, p_excluir_domingos, v_neg.dias_credito);

  return jsonb_build_object(
    'capital',      round(p_capital, 2),
    'tasa_interes', v_tasa,
    'interes',      v_interes,
    'total',        v_total,
    'fecha_inicio', v_inicio,
    'num_cuotas',   jsonb_array_length(v_cuotas),
    'valor_cuota',  v_cuotas->0->'monto',
    'cuotas',       v_cuotas
  );
end $$;

-- Crea el fiado y sus cuotas (mismos parámetros que simular_deuda + descripción).
create or replace function public.crear_deuda(
  p_cliente            uuid,
  p_capital            numeric,
  p_descripcion        text    default null,
  p_apartado           uuid    default null,
  p_tasa_interes       numeric default null,
  p_fecha_inicio       date    default null,
  p_fecha_fin          date    default null,
  p_frecuencia         text    default null,
  p_num_cuotas         int     default 1,
  p_primer_vencimiento date    default null,
  p_excluir_domingos   boolean default false
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_cli   clientes%rowtype;
  v_sim   jsonb;
  v_deuda uuid;
  v_n     int;
begin
  select * into v_cli from clientes where id = p_cliente;
  if not found or not es_miembro(v_cli.negocio_id) then raise exception 'Cliente no encontrado'; end if;
  if p_apartado is not null and not exists (select 1 from apartados where id = p_apartado and negocio_id = v_cli.negocio_id) then
    raise exception 'Apartado no válido';
  end if;

  v_sim := simular_deuda(v_cli.negocio_id, p_capital, p_tasa_interes, p_apartado, p_fecha_inicio,
                         p_fecha_fin, p_frecuencia, p_num_cuotas, p_primer_vencimiento, p_excluir_domingos);
  v_n := (v_sim->>'num_cuotas')::int;

  insert into deudas (negocio_id, cliente_id, apartado_id, descripcion, capital, tasa_interes, interes, monto,
                      fecha, fecha_fin, modalidad, num_cuotas, frecuencia, excluir_domingos)
  values (v_cli.negocio_id, p_cliente, p_apartado, p_descripcion,
          (v_sim->>'capital')::numeric, (v_sim->>'tasa_interes')::numeric, (v_sim->>'interes')::numeric,
          (v_sim->>'total')::numeric, (v_sim->>'fecha_inicio')::date, p_fecha_fin,
          case when v_n = 1 then 'unico' else 'cuotas' end, v_n,
          case when v_n = 1 and p_fecha_fin is null then null else p_frecuencia end,
          coalesce(p_excluir_domingos, false))
  returning id into v_deuda;

  insert into cuotas (negocio_id, deuda_id, numero, monto, fecha_vencimiento)
  select v_cli.negocio_id, v_deuda, (c->>'numero')::int, (c->>'monto')::numeric, (c->>'vence')::date
    from jsonb_array_elements(v_sim->'cuotas') c;

  return v_deuda;
end $$;

-- Al registrar un pago se reparte entre las cuotas pendientes (la más antigua primero).
create or replace function public.trg_pago_aplicar()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_rest numeric(12,2) := new.monto;
  v_apl  numeric(12,2);
  v_c    record;
begin
  if new.deuda_id is not null and not exists (
       select 1 from deudas where id = new.deuda_id and cliente_id = new.cliente_id and not anulada) then
    raise exception 'La deuda no pertenece a este cliente o está anulada';
  end if;

  for v_c in
    select c.id, c.monto - c.pagado as saldo
      from cuotas c join deudas d on d.id = c.deuda_id
     where d.cliente_id = new.cliente_id
       and not d.anulada
       and (new.deuda_id is null or d.id = new.deuda_id)
       and c.pagado < c.monto
     order by c.fecha_vencimiento, d.fecha, c.numero
       for update of c
  loop
    exit when v_rest <= 0;
    v_apl := least(v_rest, v_c.saldo);
    update cuotas set pagado = pagado + v_apl where id = v_c.id;
    insert into pago_aplicaciones (negocio_id, pago_id, cuota_id, monto)
    values (new.negocio_id, new.id, v_c.id, v_apl);
    v_rest := v_rest - v_apl;
  end loop;

  if v_rest > 0 then
    raise exception 'El pago de % supera el saldo pendiente (sobran %)', new.monto, v_rest;
  end if;
  return new;
end $$;
create trigger pagos_aplicar after insert on public.pagos
  for each row execute function public.trg_pago_aplicar();

-- Al eliminar un pago se devuelve el saldo a las cuotas.
create or replace function public.trg_pago_revertir()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update cuotas c set pagado = c.pagado - a.monto
    from pago_aplicaciones a
   where a.pago_id = old.id and a.cuota_id = c.id;
  return old;
end $$;
create trigger pagos_revertir before delete on public.pagos
  for each row execute function public.trg_pago_revertir();

-- No se puede anular ni borrar una deuda que ya tiene pagos.
create or replace function public.trg_deuda_proteger()
returns trigger language plpgsql set search_path = public as $$
begin
  if (tg_op = 'DELETE' or (new.anulada and not old.anulada))
     and exists (select 1 from cuotas where deuda_id = old.id and pagado > 0) then
    raise exception 'La deuda tiene pagos registrados. Elimine primero esos pagos.';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end $$;
create trigger deudas_proteger before update or delete on public.deudas
  for each row execute function public.trg_deuda_proteger();

-- ---------------------------------------------------------------------
-- 4. VISTAS (semáforo, días de mora, saldos)
--    security_invoker = true → respetan la seguridad (RLS) del usuario
-- ---------------------------------------------------------------------

create view public.v_cuotas with (security_invoker = true) as
select c.id, c.negocio_id, c.deuda_id, d.cliente_id, d.apartado_id, d.descripcion,
       d.fecha as fecha_deuda, d.num_cuotas, c.numero, c.monto, c.pagado,
       (c.monto - c.pagado) as saldo, c.fecha_vencimiento, x.hoy,
       case when c.monto > c.pagado and c.fecha_vencimiento < x.hoy
            then x.hoy - c.fecha_vencimiento else 0 end as dias_atraso,
       case when c.monto <= c.pagado                          then 'pagada'
            when c.fecha_vencimiento <  x.hoy                 then 'vencida'
            when c.fecha_vencimiento <= x.hoy + n.dias_aviso  then 'por_vencer'
            else 'al_dia' end as estado,
       case when c.monto <= c.pagado                          then 'verde'
            when c.fecha_vencimiento <  x.hoy                 then 'rojo'
            when c.fecha_vencimiento <= x.hoy + n.dias_aviso  then 'amarillo'
            else 'verde' end as semaforo
  from public.cuotas c
  join public.deudas d   on d.id = c.deuda_id and not d.anulada
  join public.negocios n on n.id = c.negocio_id
  cross join lateral (select (now() at time zone n.zona_horaria)::date as hoy) x;

create view public.v_deudas with (security_invoker = true) as
select d.id, d.negocio_id, d.cliente_id, d.apartado_id,
       coalesce(a.nombre, 'General') as apartado,
       d.descripcion, d.capital, d.tasa_interes, d.interes, d.monto, d.fecha, d.fecha_fin,
       d.modalidad, d.num_cuotas, d.frecuencia, d.excluir_domingos, d.created_at,
       coalesce(sum(vc.pagado), 0)                              as pagado,
       coalesce(sum(vc.saldo), 0)                               as saldo,
       count(vc.id) filter (where vc.estado <> 'pagada')        as cuotas_pendientes,
       count(vc.id) filter (where vc.estado = 'vencida')        as cuotas_vencidas,
       min(vc.fecha_vencimiento) filter (where vc.saldo > 0)    as proximo_vencimiento,
       coalesce(max(vc.dias_atraso), 0)                         as dias_atraso,
       case when bool_or(vc.estado = 'vencida')    then 'rojo'
            when bool_or(vc.estado = 'por_vencer') then 'amarillo'
            else 'verde' end                                    as semaforo
  from public.deudas d
  left join public.apartados a on a.id = d.apartado_id
  left join public.v_cuotas vc on vc.deuda_id = d.id
 where not d.anulada
 group by d.id, a.nombre;

create view public.v_clientes_resumen with (security_invoker = true) as
select c.id, c.negocio_id, c.nombres, c.cedula, c.celular, c.email, c.direccion,
       c.notas, c.foto_url, c.limite_credito, c.portal_token, c.portal_activo, c.activo, c.created_at,
       coalesce(s.saldo_total, 0)       as saldo_total,
       coalesce(s.total_vencido, 0)     as total_vencido,
       coalesce(s.cuotas_vencidas, 0)   as cuotas_vencidas,
       coalesce(s.dias_mora, 0)         as dias_mora,       -- días de la cuota más atrasada
       s.deuda_desde,
       case when s.deuda_desde is null then 0 else x.hoy - s.deuda_desde end as dias_deuda, -- días debiendo
       s.proximo_vencimiento,
       case when c.limite_credito is null then null
            else c.limite_credito - coalesce(s.saldo_total, 0) end as credito_disponible,
       case when s.hay_vencidas   then 'rojo'
            when s.hay_por_vencer then 'amarillo'
            else 'verde' end            as semaforo
  from public.clientes c
  join public.negocios n on n.id = c.negocio_id
  cross join lateral (select (now() at time zone n.zona_horaria)::date as hoy) x
  left join lateral (
       select sum(vc.saldo)                                        as saldo_total,
              sum(vc.saldo) filter (where vc.estado = 'vencida')   as total_vencido,
              count(*)      filter (where vc.estado = 'vencida')   as cuotas_vencidas,
              max(vc.dias_atraso)                                  as dias_mora,
              min(vc.fecha_deuda)       filter (where vc.saldo > 0) as deuda_desde,
              min(vc.fecha_vencimiento) filter (where vc.saldo > 0) as proximo_vencimiento,
              bool_or(vc.estado = 'vencida')                       as hay_vencidas,
              bool_or(vc.estado = 'por_vencer')                    as hay_por_vencer
         from public.v_cuotas vc
        where vc.cliente_id = c.id) s on true;

create view public.v_saldo_por_apartado with (security_invoker = true) as
select vc.negocio_id, vc.cliente_id, vc.apartado_id,
       coalesce(a.nombre, 'General') as apartado,
       sum(vc.saldo) as saldo
  from public.v_cuotas vc
  left join public.apartados a on a.id = vc.apartado_id
 group by vc.negocio_id, vc.cliente_id, vc.apartado_id, a.nombre
having sum(vc.saldo) > 0;

create view public.v_dashboard with (security_invoker = true) as
select n.id as negocio_id, n.nombre, n.simbolo,
       coalesce(sum(r.saldo_total), 0)                          as total_por_cobrar,
       coalesce(sum(r.total_vencido), 0)                        as total_vencido,
       count(r.id) filter (where r.saldo_total > 0)             as clientes_con_deuda,
       count(r.id) filter (where r.semaforo = 'rojo')           as clientes_rojo,
       count(r.id) filter (where r.semaforo = 'amarillo' and r.saldo_total > 0) as clientes_amarillo,
       (select coalesce(sum(p.monto), 0) from public.pagos p
         where p.negocio_id = n.id
           and date_trunc('month', p.fecha) = date_trunc('month', (now() at time zone n.zona_horaria)::date)
       )                                                         as cobrado_mes
  from public.negocios n
  left join public.v_clientes_resumen r on r.negocio_id = n.id and r.activo
 group by n.id;

-- ---------------------------------------------------------------------
-- 5. RECORDATORIO (mensaje armado con total y cuota atrasada)
--    Placeholders de la plantilla: {cliente} {negocio} {total} {detalle} {link}
--    La app abre WhatsApp con: https://wa.me/<celular>?text=<mensaje codificado>
-- ---------------------------------------------------------------------

create or replace function public.generar_recordatorio(p_cliente uuid, p_url_base text default null)
returns jsonb language plpgsql stable security invoker set search_path = public as $$
declare
  v_cli     record;
  v_neg     negocios%rowtype;
  v_venc    record;
  v_prox    record;
  v_detalle text := '';
  v_link    text := '';
  v_msg     text;
begin
  select * into v_cli from v_clientes_resumen where id = p_cliente;
  if not found then raise exception 'Cliente no encontrado'; end if;
  select * into v_neg from negocios where id = v_cli.negocio_id;

  select count(*) as n, sum(saldo) as total, max(dias_atraso) as dias,
         (array_agg(numero      order by fecha_vencimiento))[1] as numero,
         (array_agg(num_cuotas  order by fecha_vencimiento))[1] as de,
         (array_agg(saldo       order by fecha_vencimiento))[1] as saldo
    into v_venc
    from v_cuotas where cliente_id = p_cliente and estado = 'vencida';

  if v_venc.n = 1 then
    v_detalle := case when v_venc.de > 1
      then format('La cuota %s de %s por %s está atrasada %s día(s).', v_venc.numero, v_venc.de,
                  fmt_dinero(v_venc.saldo, v_neg.simbolo), v_venc.dias)
      else format('Tienes %s vencido hace %s día(s).', fmt_dinero(v_venc.saldo, v_neg.simbolo), v_venc.dias) end;
  elsif v_venc.n > 1 then
    v_detalle := format('Tienes %s cuotas atrasadas por %s; la más antigua lleva %s día(s) de atraso.',
                        v_venc.n, fmt_dinero(v_venc.total, v_neg.simbolo), v_venc.dias);
  else
    select saldo, fecha_vencimiento into v_prox
      from v_cuotas where cliente_id = p_cliente and saldo > 0
     order by fecha_vencimiento limit 1;
    if found then
      v_detalle := format('Tu próximo pago de %s vence el %s.',
                          fmt_dinero(v_prox.saldo, v_neg.simbolo), to_char(v_prox.fecha_vencimiento, 'DD/MM/YYYY'));
    end if;
  end if;

  if p_url_base is not null and v_cli.portal_activo then
    v_link := rtrim(p_url_base, '/') || '/c/' || v_cli.portal_token;
  end if;

  v_msg := v_neg.plantilla_recordatorio;
  if v_link = '' then
    v_msg := replace(v_msg, 'Puedes ver tu detalle aquí: {link}', '');
  end if;
  v_msg := replace(v_msg, '{cliente}', split_part(v_cli.nombres, ' ', 1));
  v_msg := replace(v_msg, '{negocio}', v_neg.nombre);
  v_msg := replace(v_msg, '{total}',   fmt_dinero(v_cli.saldo_total, v_neg.simbolo));
  v_msg := replace(v_msg, '{detalle}', v_detalle);
  v_msg := replace(v_msg, '{link}',    v_link);
  v_msg := regexp_replace(trim(v_msg), '\s{2,}', ' ', 'g');

  return jsonb_build_object(
    'mensaje',  v_msg,
    'celular',  regexp_replace(coalesce(v_cli.celular, ''), '\D', '', 'g'),
    'email',    v_cli.email,
    'semaforo', v_cli.semaforo,
    'total',    v_cli.saldo_total
  );
end $$;

-- ---------------------------------------------------------------------
-- 6. PORTAL DEL CLIENTE POR QR (acceso público, solo lectura)
--    El QR apunta a  https://<tu-web>/c/<portal_token>
--    La web llama:   supabase.rpc('portal_cliente', { p_token })
-- ---------------------------------------------------------------------

create or replace function public.portal_cliente(p_token uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_cli clientes%rowtype;
begin
  select * into v_cli from clientes where portal_token = p_token and portal_activo and activo;
  if not found then return null; end if;

  return jsonb_build_object(
    'negocio', (select jsonb_build_object('nombre', nombre, 'telefono', telefono, 'logo_url', logo_url,
                                          'moneda', moneda, 'simbolo', simbolo)
                  from negocios where id = v_cli.negocio_id),
    'cliente', jsonb_build_object('nombres', v_cli.nombres),
    'resumen', (select jsonb_build_object('saldo_total', saldo_total, 'total_vencido', total_vencido,
                                          'cuotas_vencidas', cuotas_vencidas, 'dias_mora', dias_mora,
                                          'dias_deuda', dias_deuda, 'proximo_vencimiento', proximo_vencimiento,
                                          'semaforo', semaforo)
                  from v_clientes_resumen where id = v_cli.id),
    'apartados', (select coalesce(jsonb_agg(jsonb_build_object('apartado', apartado, 'saldo', saldo)
                                            order by saldo desc), '[]'::jsonb)
                    from v_saldo_por_apartado where cliente_id = v_cli.id),
    'deudas', (select coalesce(jsonb_agg(jsonb_build_object(
                  'descripcion', d.descripcion, 'apartado', d.apartado, 'fecha', d.fecha,
                  'fecha_fin', d.fecha_fin, 'capital', d.capital, 'interes', d.interes, 'monto', d.monto, 'saldo', d.saldo, 'semaforo', d.semaforo,
                  'cuotas', (select jsonb_agg(jsonb_build_object(
                                'numero', c.numero, 'monto', c.monto, 'saldo', c.saldo,
                                'vence', c.fecha_vencimiento, 'estado', c.estado,
                                'semaforo', c.semaforo, 'dias_atraso', c.dias_atraso)
                              order by c.numero)
                               from v_cuotas c where c.deuda_id = d.id))
                order by d.fecha desc), '[]'::jsonb)
                 from v_deudas d where d.cliente_id = v_cli.id and d.saldo > 0),
    'pagos', (select coalesce(jsonb_agg(jsonb_build_object('fecha', p.fecha, 'monto', p.monto, 'metodo', p.metodo)
                                        order by p.fecha desc), '[]'::jsonb)
                from (select * from pagos where cliente_id = v_cli.id order by fecha desc, created_at desc limit 20) p)
  );
end $$;

-- Genera un QR nuevo (invalida el anterior), p. ej. si el cliente perdió el enlace.
create or replace function public.regenerar_qr(p_cliente uuid)
returns uuid language plpgsql security invoker set search_path = public as $$
declare v_token uuid;
begin
  update clientes set portal_token = gen_random_uuid()
   where id = p_cliente returning portal_token into v_token;
  if v_token is null then raise exception 'Cliente no encontrado'; end if;
  return v_token;
end $$;

-- ---------------------------------------------------------------------
-- 7. SEGURIDAD (Row Level Security): cada comercio solo ve lo suyo
-- ---------------------------------------------------------------------

alter table public.negocios          enable row level security;
alter table public.negocio_miembros  enable row level security;
alter table public.clientes          enable row level security;
alter table public.apartados         enable row level security;
alter table public.deudas            enable row level security;
alter table public.cuotas            enable row level security;
alter table public.pagos             enable row level security;
alter table public.pago_aplicaciones enable row level security;
alter table public.recordatorios     enable row level security;

create policy negocios_sel on public.negocios for select to authenticated using (es_miembro(id));
create policy negocios_ins on public.negocios for insert to authenticated with check (created_by = auth.uid());
create policy negocios_upd on public.negocios for update to authenticated using (es_dueno(id)) with check (es_dueno(id));
create policy negocios_del on public.negocios for delete to authenticated using (es_dueno(id));

create policy miembros_sel on public.negocio_miembros for select to authenticated using (es_miembro(negocio_id));
create policy miembros_ins on public.negocio_miembros for insert to authenticated with check (es_dueno(negocio_id));
create policy miembros_del on public.negocio_miembros for delete to authenticated using (es_dueno(negocio_id) and user_id <> auth.uid());

create policy clientes_all on public.clientes for all to authenticated
  using (es_miembro(negocio_id)) with check (es_miembro(negocio_id));
create policy apartados_all on public.apartados for all to authenticated
  using (es_miembro(negocio_id)) with check (es_miembro(negocio_id));
create policy deudas_all on public.deudas for all to authenticated
  using (es_miembro(negocio_id)) with check (es_miembro(negocio_id));
create policy cuotas_all on public.cuotas for all to authenticated
  using (es_miembro(negocio_id)) with check (es_miembro(negocio_id));
create policy pagos_all on public.pagos for all to authenticated
  using (es_miembro(negocio_id)) with check (es_miembro(negocio_id));
create policy pago_apl_sel on public.pago_aplicaciones for select to authenticated
  using (es_miembro(negocio_id));
create policy recordatorios_all on public.recordatorios for all to authenticated
  using (es_miembro(negocio_id)) with check (es_miembro(negocio_id));

-- Permisos por columna: montos y saldos solo cambian por las funciones de arriba.
revoke all on all tables in schema public from anon;
revoke insert, update, delete on public.deudas, public.cuotas, public.pago_aplicaciones from authenticated;
grant  delete on public.deudas to authenticated;
grant  update (descripcion, apartado_id, anulada) on public.deudas to authenticated;
grant  update (fecha_vencimiento) on public.cuotas to authenticated;
revoke update on public.pagos from authenticated;
grant  update (fecha, metodo, nota) on public.pagos to authenticated;
revoke update on public.negocio_miembros from authenticated;
revoke update on public.negocios from authenticated;
grant  update (nombre, telefono, email, direccion, logo_url, moneda, simbolo, zona_horaria,
                dias_credito, dias_aviso, plantilla_recordatorio) on public.negocios to authenticated;
grant  select on public.v_cuotas, public.v_deudas, public.v_clientes_resumen,
                public.v_saldo_por_apartado, public.v_dashboard to authenticated;

revoke execute on all functions in schema public from public, anon;
grant  execute on all functions in schema public to authenticated;
grant  execute on function public.portal_cliente(uuid) to anon;

-- =====================================================================
--  FIN. Uso desde la app (supabase-js), ejemplos:
--   supabase.from('v_clientes_resumen').select('*').order('dias_mora', { ascending: false })
--   supabase.rpc('simular_deuda', { p_negocio, p_capital: 100, p_tasa_interes: 20,
--                 p_fecha_inicio: '2026-12-01', p_fecha_fin: '2026-12-29', p_frecuencia: 'semanal' })
--   supabase.rpc('crear_deuda',   { p_cliente, p_capital: 100, p_apartado, p_fecha_inicio: '2026-12-01',
--                 p_fecha_fin: '2026-12-29', p_frecuencia: 'diaria', p_excluir_domingos: true })
--   supabase.from('pagos').insert({ negocio_id, cliente_id, monto: 30 })
--   supabase.rpc('generar_recordatorio', { p_cliente, p_url_base: 'https://fiados.app' })
--   supabase.rpc('portal_cliente', { p_token })   -- página pública del QR
-- =====================================================================
