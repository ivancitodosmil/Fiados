import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated';

import { Screen } from '@/components/screen';
import {
  Avatar,
  Between,
  BigMoney,
  Button,
  Card,
  Chip,
  Empty,
  ErrorBox,
  Header,
  HeaderLink,
  Ionicons,
  Loading,
  StatusTag,
  Press,
  Row,
  SectionTitle,
  Soft,
  T,
} from '@/components/ui';
import { confirm } from '@/lib/confirm';
import { dateLong, dateShort, money, num, phoneDisplay, plural } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { useReminder } from '@/lib/reminder';
import { supabase } from '@/lib/supabase';
import { C, F } from '@/lib/theme';
import { useToast } from '@/lib/toast';
import {
  clienteStatus,
  cuotaStatus,
  deudaStatus,
  metodoLabel,
  type ClienteResumen,
  type Cuota,
  type Deuda,
  type Pago,
} from '@/lib/types';
import { must, useData } from '@/lib/use-data';

type Saldo = { apartado_id: string | null; apartado: string; saldo: number };

export default function ClienteDetalle() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const toast = useToast();
  const reminder = useReminder();
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [verPagadas, setVerPagadas] = useState(false);

  const { data, error, loading, refreshing, refresh, reload } = useData(async () => {
    const [cli, saldos, deudas, cuotas, pagos] = await Promise.all([
      supabase.from('v_clientes_resumen').select('*').eq('id', id).maybeSingle(),
      supabase.from('v_saldo_por_apartado').select('apartado_id,apartado,saldo').eq('cliente_id', id).order('saldo', { ascending: false }),
      supabase.from('v_deudas').select('*').eq('cliente_id', id).order('fecha', { ascending: false }).order('created_at', { ascending: false }),
      supabase.from('v_cuotas').select('*').eq('cliente_id', id).order('numero'),
      supabase
        .from('pagos')
        .select('id,cliente_id,deuda_id,monto,fecha,metodo,nota,created_at')
        .eq('cliente_id', id)
        .order('fecha', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(10),
    ]);
    return {
      cliente: must(cli) as ClienteResumen | null,
      saldos: must(saldos) as Saldo[],
      deudas: must(deudas) as Deuda[],
      cuotas: must(cuotas) as Cuota[],
      pagos: must(pagos) as Pago[],
    };
  }, [id]);

  const c = data?.cliente;

  if (loading || !c) {
    return (
      <Screen header={<Header />}>
        {loading ? <Loading /> : <ErrorBox message={error ?? 'Cliente no encontrado'} onRetry={reload} />}
      </Screen>
    );
  }

  const st = clienteStatus(c);
  const activas = data.deudas.filter((d) => num(d.saldo) > 0);
  const pagadas = data.deudas.filter((d) => num(d.saldo) <= 0);
  const cuotasDe = (deudaId: string) => data.cuotas.filter((q) => q.deuda_id === deudaId);

  async function anular(d: Deuda) {
    const ok = await confirm(
      '¿Anular este fiado?',
      `Se anulará "${d.descripcion || d.apartado}" por ${money(d.monto)}. Solo se puede anular si no tiene pagos.`,
      'Anular',
      true,
    );
    if (!ok) return;
    const { error: e } = await supabase.from('deudas').update({ anulada: true }).eq('id', d.id);
    if (e) toast.error(e);
    else {
      toast.show('Fiado anulado');
      reload();
    }
  }

  async function eliminarPago(p: Pago) {
    const ok = await confirm('¿Eliminar pago?', `Se eliminará el pago de ${money(p.monto)} y el saldo volverá a las cuotas.`, 'Eliminar', true);
    if (!ok) return;
    const { error: e } = await supabase.from('pagos').delete().eq('id', p.id);
    if (e) toast.error(e);
    else {
      toast.show('Pago eliminado');
      reload();
    }
  }

  async function toggleActivo() {
    const desactivar = c!.activo;
    const ok = await confirm(
      desactivar ? '¿Desactivar cliente?' : '¿Reactivar cliente?',
      desactivar
        ? 'Dejará de aparecer en tus listas y en el resumen. Su historial se conserva y puedes reactivarlo cuando quieras.'
        : 'Volverá a aparecer en tus listas.',
      desactivar ? 'Desactivar' : 'Reactivar',
      desactivar,
    );
    if (!ok) return;
    const { error: e } = await supabase.from('clientes').update({ activo: !desactivar }).eq('id', c!.id);
    if (e) toast.error(e);
    else {
      toast.show(desactivar ? 'Cliente desactivado' : 'Cliente reactivado');
      reload();
    }
  }

  const stats: { label: string; value: string; color?: string }[] = [];
  if (num(c.saldo_total) > 0) {
    if (num(c.total_vencido) > 0) stats.push({ label: 'Vencido', value: money(c.total_vencido), color: C.vencido });
    if (c.proximo_vencimiento) stats.push({ label: 'Próximo pago', value: dateShort(c.proximo_vencimiento) });
    stats.push({ label: 'Debiendo hace', value: plural(num(c.dias_deuda), 'día', 'días') });
  }
  if (c.limite_credito != null) {
    stats.push({
      label: `Disponible de ${money(c.limite_credito)}`,
      value: money(c.credito_disponible),
      color: num(c.credito_disponible) < 0 ? C.vencido : undefined,
    });
  }

  return (
    <Screen
      refreshing={refreshing}
      onRefresh={refresh}
      header={<Header right={<HeaderLink label="Editar" onPress={() => router.push(`/cliente/${c.id}/editar`)} />} />}>
      <Row style={{ marginBottom: 16, marginTop: 4, alignItems: 'flex-start' }}>
        <Avatar name={c.nombres} size={52} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <T variant="h2" numberOfLines={2} accessibilityRole="header">
            {c.nombres}
          </T>
          {c.cedula ? (
            <T variant="muted" style={{ fontVariant: ['tabular-nums'] }}>
              CI {c.cedula}
            </T>
          ) : null}
          {c.celular ? (
            <T variant="muted" style={{ fontVariant: ['tabular-nums'] }}>
              {phoneDisplay(c.celular)}
            </T>
          ) : null}
        </View>
      </Row>

      {!c.activo && (
        <View style={styles.inactivo}>
          <Ionicons name="pause-circle-outline" size={18} color={C.gris} />
          <T variant="small" style={{ flex: 1 }}>
            Cliente inactivo. No aparece en tus listas.
          </T>
        </View>
      )}

      <Soft>
        <Between style={{ alignItems: 'flex-start' }}>
          <View style={{ flex: 1 }}>
            <T variant="muted">Debe en total</T>
            <BigMoney value={c.saldo_total} size={36} centsColor={C.tinta} style={{ marginTop: 2 }} />
          </View>
          <View style={{ alignItems: 'flex-end', gap: 4, marginTop: 2 }}>
            <StatusTag estado={st.estado} label={st.label} />
            {st.detail ? <T variant="small">{st.detail}</T> : null}
          </View>
        </Between>
        {stats.length > 0 && (
          <View style={styles.stats}>
            {stats.map((x) => (
              <View key={x.label} style={styles.stat}>
                <T variant="small">{x.label}</T>
                <T style={{ fontFamily: F.semibold, fontSize: 15, color: x.color ?? C.tinta, fontVariant: ['tabular-nums'] }}>{x.value}</T>
              </View>
            ))}
          </View>
        )}
        {data.saldos.length > 0 && (
          <View style={styles.chips}>
            {data.saldos.map((s) => (
              <Chip key={s.apartado_id ?? 'general'} label={`${s.apartado} ${money(s.saldo)}`} />
            ))}
          </View>
        )}
      </Soft>

      <Row style={{ gap: 8, marginTop: 14 }}>
        <Button
          title="Recordar"
          icon="whatsapp"
          height={50}
          style={{ flex: 1.35 }}
          loading={reminder.sendingId === c.id}
          disabled={num(c.saldo_total) <= 0}
          accessibilityLabel="Enviar recordatorio por WhatsApp"
          onPress={() => reminder.send(c.id)}
        />
        <Button
          title="Pago"
          variant="secondary"
          height={50}
          style={{ flex: 1 }}
          disabled={num(c.saldo_total) <= 0}
          accessibilityLabel="Registrar pago"
          onPress={() => router.push({ pathname: '/pago/nuevo', params: { cliente: c.id } })}
        />
        <Button
          title="QR"
          variant="secondary"
          height={50}
          style={{ width: 64, paddingHorizontal: 0 }}
          accessibilityLabel="Ver código QR del cliente"
          onPress={() => router.push(`/cliente/${c.id}/qr`)}
        />
      </Row>
      <Button
        title="Nuevo fiado"
        icon="add"
        variant="secondary"
        height={50}
        style={{ marginTop: 8 }}
        disabled={!c.activo}
        onPress={() => router.push({ pathname: '/fiado/nuevo', params: { cliente: c.id } })}
      />

      {/* ------------------------------ deudas */}
      {activas.length === 0 && pagadas.length === 0 ? (
        <Card style={{ marginTop: 24 }}>
          <Empty icon="receipt-outline" title="Sin fiados todavía" text="Registra lo que se lleva a crédito con “Nuevo fiado”." />
        </Card>
      ) : null}

      {activas.map((d) => (
        <DeudaCard
          key={d.id}
          d={d}
          cuotas={cuotasDe(d.id)}
          open={open[d.id] ?? activas.length === 1}
          onToggle={() => {
            haptic('select');
            setOpen((o) => ({ ...o, [d.id]: !(o[d.id] ?? activas.length === 1) }));
          }}
          onPagar={() => router.push({ pathname: '/pago/nuevo', params: { cliente: c.id, deuda: d.id } })}
          onAnular={() => anular(d)}
        />
      ))}

      {pagadas.length > 0 && (
        <Pressable
          accessibilityRole="button"
          onPress={() => setVerPagadas((v) => !v)}
          style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 }}>
          <Ionicons name={verPagadas ? 'chevron-up' : 'chevron-down'} size={18} color={C.verde} />
          <T style={{ color: C.verde, fontFamily: F.semibold, fontSize: 15 }}>
            {verPagadas ? 'Ocultar' : 'Ver'} {plural(pagadas.length, 'fiado pagado', 'fiados pagados')}
          </T>
        </Pressable>
      )}
      {verPagadas &&
        pagadas.map((d) => (
          <DeudaCard
            key={d.id}
            d={d}
            cuotas={cuotasDe(d.id)}
            open={!!open[d.id]}
            onToggle={() => setOpen((o) => ({ ...o, [d.id]: !o[d.id] }))}
          />
        ))}

      {/* ------------------------------ pagos */}
      <SectionTitle style={{ marginTop: 28 }}>Pagos recientes</SectionTitle>
      {data.pagos.length === 0 ? (
        <T variant="muted" style={{ paddingHorizontal: 2 }}>
          Aún no hay pagos registrados.
        </T>
      ) : (
        <Card style={{ paddingVertical: 2, paddingHorizontal: 14 }}>
          {data.pagos.map((p, i) => (
            <Press
              key={p.id}
              scaleTo={0.985}
              onLongPress={() => eliminarPago(p)}
              accessibilityLabel={`Pago de ${money(p.monto)} el ${dateLong(p.fecha)}, ${metodoLabel(p.metodo)}. Mantén presionado para eliminar.`}
              style={[styles.pagoRow, i < data.pagos.length - 1 && styles.border]}>
              <View style={styles.pagoIcon}>
                <Ionicons name="arrow-down" size={18} color={C.ok} />
              </View>
              <View style={{ flex: 1 }}>
                <T style={{ fontFamily: F.medium }}>{dateShort(p.fecha)}</T>
                <T variant="small" numberOfLines={1}>
                  {metodoLabel(p.metodo)}
                </T>
                {p.nota ? (
                  <T variant="small" numberOfLines={1}>
                    {p.nota}
                  </T>
                ) : null}
              </View>
              <T variant="num" style={{ color: C.ok }}>
                +{money(p.monto)}
              </T>
            </Press>
          ))}
        </Card>
      )}

      <Button
        title={c.activo ? 'Desactivar cliente' : 'Reactivar cliente'}
        variant={c.activo ? 'danger' : 'secondary'}
        icon={c.activo ? 'pause-circle-outline' : 'play-circle-outline'}
        style={{ marginTop: 32 }}
        onPress={toggleActivo}
      />
    </Screen>
  );
}

function DeudaCard({
  d,
  cuotas,
  open,
  onToggle,
  onPagar,
  onAnular,
}: {
  d: Deuda;
  cuotas: Cuota[];
  open: boolean;
  onToggle: () => void;
  onPagar?: () => void;
  onAnular?: () => void;
}) {
  const st = deudaStatus(d);
  const titulo = d.descripcion || d.apartado;
  const meta = [d.descripcion ? d.apartado : null, num(d.tasa_interes) > 0 ? `${num(d.tasa_interes)}% de interés` : null, `desde el ${dateShort(d.fecha)}`.replace(/ /g, '\u00A0')]
    .filter(Boolean)
    .join(', ');
  return (
    <View>
      <SectionTitle>{titulo}</SectionTitle>
      <Card style={{ paddingVertical: 4, paddingHorizontal: 14 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}
          accessibilityLabel={`${titulo}. Saldo ${money(d.saldo)} de ${money(d.monto)}. ${st.label}. ${open ? 'Ocultar' : 'Ver'} cuotas`}
          onPress={onToggle}
          style={styles.deudaHead}>
          <View style={{ flex: 1 }}>
            <T variant="num" style={{ fontSize: 20, color: st.estado === 'rojo' ? C.vencido : C.tinta }}>
              {money(d.saldo)}
            </T>
            <T variant="small" style={{ fontVariant: ['tabular-nums'] }}>
              de {money(d.monto)} en {plural(num(d.num_cuotas), 'cuota', 'cuotas')}
            </T>
            <T variant="small">{meta.charAt(0).toUpperCase() + meta.slice(1)}</T>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 4 }}>
            <StatusTag estado={st.estado} label={st.label} />
            {st.detail ? <T variant="small">{st.detail}</T> : null}
          </View>
          <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={20} color={C.grisSuave} />
        </Pressable>

        {open && (
          <Animated.View entering={FadeIn.duration(180).reduceMotion(ReduceMotion.System)}>
            {cuotas.map((q) => {
              const qs = cuotaStatus(q);
              return (
                <View key={q.id} style={[styles.cuota, styles.borderTop]}>
                  <View style={styles.num}>
                    <T style={{ fontFamily: F.heading, fontSize: 13, fontVariant: ['tabular-nums'] }}>{q.numero}</T>
                  </View>
                  <View style={{ flex: 1 }}>
                    <T style={{ fontFamily: F.medium, fontVariant: ['tabular-nums'], color: q.estado === 'vencida' ? C.vencido : C.tinta }}>
                      {money(q.estado === 'pagada' ? q.monto : q.saldo)}
                      {q.estado !== 'pagada' && num(q.pagado) > 0 ? (
                        <T variant="small"> de {money(q.monto)}</T>
                      ) : null}
                    </T>
                    <T variant="small">Vence el {dateShort(q.fecha_vencimiento)}</T>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <StatusTag estado={qs.estado} label={qs.label} />
                    {qs.detail ? <T variant="small">{qs.detail}</T> : null}
                  </View>
                </View>
              );
            })}
            {(onPagar || onAnular) && (
              <Row style={[styles.borderTop, { paddingVertical: 10, gap: 8 }]}>
                {onPagar && <Button title="Pagar este fiado" variant="secondary" height={44} style={{ flex: 1 }} onPress={onPagar} />}
                {onAnular && num(d.pagado) <= 0 && (
                  <Button title="Anular" variant="danger" height={44} style={{ paddingHorizontal: 18 }} onPress={onAnular} />
                )}
              </Row>
            )}
          </Animated.View>
        )}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  stats: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 14, rowGap: 12 },
  stat: { width: '50%', paddingRight: 8, gap: 2 },
  inactivo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.track,
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
  },
  deudaHead: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, minHeight: 64 },
  cuota: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  num: { width: 28, height: 28, borderRadius: 9, backgroundColor: C.papel, alignItems: 'center', justifyContent: 'center' },
  borderTop: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.borde },
  border: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.borde },
  pagoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, minHeight: 60 },
  pagoIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.okBg, alignItems: 'center', justifyContent: 'center' },
});
