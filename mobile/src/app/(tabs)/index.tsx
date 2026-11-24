import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ClienteRow } from '@/components/cliente-row';
import { Screen } from '@/components/screen';
import { Avatar, Between, BigMoney, Button, Card, Empty, ErrorBox, Loading, Row, Soft, T } from '@/components/ui';
import { money, moneyShort, monthShort, num, plural } from '@/lib/format';
import { useReminder } from '@/lib/reminder';
import { useNegocio, useSession } from '@/lib/session';
import { supabase } from '@/lib/supabase';
import { C, F, tabular } from '@/lib/theme';
import type { ClienteResumen, Dashboard } from '@/lib/types';
import { must, useData } from '@/lib/use-data';

export default function Inicio() {
  const negocio = useNegocio();
  const { session } = useSession();
  const reminder = useReminder();

  const { data, error, loading, refreshing, refresh, reload } = useData(async () => {
    const [dash, conSaldo, cuotas] = await Promise.all([
      supabase.from('v_dashboard').select('*').eq('negocio_id', negocio.id).maybeSingle(),
      supabase.from('v_clientes_resumen').select('*').eq('negocio_id', negocio.id).eq('activo', true).gt('saldo_total', 0),
      supabase.from('v_cuotas').select('cliente_id,saldo,estado').eq('negocio_id', negocio.id).gt('saldo', 0),
    ]);
    const d = must(dash) as Dashboard | null;
    const clientes = must(conSaldo) as ClienteResumen[];
    const activos = new Set(clientes.map((c) => c.id));
    // Reparto del saldo por estado (solo clientes activos, igual que v_dashboard)
    const reparto = { vencido: 0, porVencer: 0, alDia: 0 };
    for (const q of must(cuotas) as { cliente_id: string; saldo: number; estado: string }[]) {
      if (!activos.has(q.cliente_id)) continue;
      if (q.estado === 'vencida') reparto.vencido += num(q.saldo);
      else if (q.estado === 'por_vencer') reparto.porVencer += num(q.saldo);
      else reparto.alDia += num(q.saldo);
    }
    const list = clientes
      .filter((c) => c.semaforo === 'rojo' || c.semaforo === 'amarillo')
      .sort((a, b) => {
        if (a.semaforo !== b.semaforo) return a.semaforo === 'rojo' ? -1 : 1;
        if (num(b.dias_mora) !== num(a.dias_mora)) return num(b.dias_mora) - num(a.dias_mora);
        return (a.proximo_vencimiento ?? '').localeCompare(b.proximo_vencimiento ?? '');
      });
    return { dash: d, reparto, atencion: list.slice(0, 8) };
  }, [negocio.id]);

  const meta = session?.user.user_metadata as { nombre?: string } | undefined;
  const saludo = meta?.nombre ? `Hola, ${meta.nombre.trim()} 👋` : 'Hola 👋';

  const total = num(data?.dash?.total_por_cobrar);
  const rojo = num(data?.dash?.clientes_rojo);
  const amarillo = num(data?.dash?.clientes_amarillo);
  const alDiaN = Math.max(0, num(data?.dash?.clientes_con_deuda) - rojo - amarillo);
  const r = data?.reparto ?? { vencido: 0, porVencer: 0, alDia: 0 };
  const segs = [
    { key: 'vencido', label: 'Vencido', amount: r.vencido, color: C.vencido, count: rojo },
    { key: 'porVencer', label: 'Por vencer', amount: r.porVencer, color: C.porVencer, count: amarillo },
    { key: 'alDia', label: 'Al día', amount: r.alDia, color: C.alDia, count: alDiaN },
  ];
  const sumSegs = segs.reduce((s, x) => s + x.amount, 0);

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <Between style={{ marginTop: 10, marginBottom: 18 }}>
        <View style={{ flex: 1 }}>
          <T variant="muted">{saludo}</T>
          <T variant="h1" numberOfLines={1} accessibilityRole="header">
            {negocio.nombre}
          </T>
        </View>
        <Avatar name={meta?.nombre || negocio.nombre} />
      </Between>

      {loading ? (
        <Loading />
      ) : error && !data ? (
        <ErrorBox message={error} onRetry={reload} />
      ) : (
        <>
          <Soft>
            <Between style={{ alignItems: 'flex-start' }}>
              <T variant="muted" style={{ fontFamily: F.medium }}>
                Por cobrar
              </T>
              <View style={{ alignItems: 'flex-end' }}>
                <T variant="small">Cobrado en {monthShort().replace('.', '')}</T>
                <T style={{ fontFamily: F.semibold, fontSize: 14, color: C.verde, ...tabular }}>{moneyShort(data?.dash?.cobrado_mes)}</T>
              </View>
            </Between>
            <BigMoney value={total} size={42} style={{ marginTop: 2, marginBottom: 16 }} />
            <View
              style={styles.bar}
              accessible
              accessibilityLabel={segs.map((x) => `${x.label} ${money(x.amount)}`).join(', ')}>
              {sumSegs > 0 &&
                segs
                  .filter((x) => x.amount > 0)
                  .map((x) => <View key={x.key} style={{ flex: x.amount / sumSegs, backgroundColor: x.color }} />)}
            </View>
            <View style={styles.legend}>
              {segs.map((x) => (
                <View key={x.key} style={styles.legendItem}>
                  <Row style={{ gap: 6 }}>
                    <View style={[styles.key, { backgroundColor: x.color }]} />
                    <T variant="small" numberOfLines={1}>
                      {x.label}
                    </T>
                  </Row>
                  <T style={{ fontFamily: F.semibold, fontSize: 15, marginTop: 3, color: x.key === 'vencido' && x.amount > 0 ? C.vencido : C.tinta, ...tabular }}>
                    {moneyShort(x.amount)}
                  </T>
                  <T variant="small" style={{ fontSize: 12 }}>
                    {plural(x.count, 'cliente', 'clientes')}
                  </T>
                </View>
              ))}
            </View>
          </Soft>

          <Row style={{ marginTop: 14, gap: 10 }}>
            <Button title="Nuevo fiado" icon="add" height={50} style={{ flex: 1 }} onPress={() => router.push('/fiado/nuevo')} />
            <Button title="Registrar pago" variant="secondary" height={50} style={{ flex: 1 }} onPress={() => router.push('/pago/nuevo')} />
          </Row>

          <T variant="title" style={{ fontSize: 18, marginTop: 28, marginBottom: 12 }} accessibilityRole="header">
            Requieren atención
          </T>
          {data && data.atencion.length > 0 ? (
            <Card style={{ paddingVertical: 2, paddingHorizontal: 14 }}>
              {data.atencion.map((c, i) => (
                <ClienteRow
                  key={c.id}
                  c={c}
                  last={i === data.atencion.length - 1}
                  onPress={() => router.push(`/cliente/${c.id}`)}
                  onWhatsApp={() => reminder.send(c.id)}
                  sending={reminder.sendingId === c.id}
                />
              ))}
            </Card>
          ) : (
            <Card>
              <Empty
                icon="checkmark-done-outline"
                title="Todo en orden"
                text={
                  total > 0
                    ? 'Nadie tiene pagos vencidos ni por vencer en los próximos días.'
                    : 'Cuando registres un fiado, aquí verás a quién cobrar primero.'
                }
              />
            </Card>
          )}
          {data && num(data.dash?.clientes_con_deuda) > 0 && (
            <T variant="small" style={{ textAlign: 'center', marginTop: 14 }}>
              {plural(num(data.dash?.clientes_con_deuda), 'cliente con saldo', 'clientes con saldo')} en total
            </T>
          )}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  bar: { height: 10, borderRadius: 99, backgroundColor: C.track, overflow: 'hidden', flexDirection: 'row', gap: 2 },
  legend: { flexDirection: 'row', marginTop: 14, gap: 8 },
  legendItem: { flex: 1 },
  key: { width: 10, height: 10, borderRadius: 3 },
});
