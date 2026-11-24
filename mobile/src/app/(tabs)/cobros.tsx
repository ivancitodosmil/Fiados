import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Screen } from '@/components/screen';
import { Avatar, Between, BigMoney, Button, Card, Empty, ErrorBox, Loading, Press, Soft, T } from '@/components/ui';
import { confirm } from '@/lib/confirm';
import { dateShort, money, monthLong, num, plural } from '@/lib/format';
import { useNegocio } from '@/lib/session';
import { supabase } from '@/lib/supabase';
import { C, F } from '@/lib/theme';
import { useToast } from '@/lib/toast';
import { metodoLabel, type Pago } from '@/lib/types';
import { must, useData } from '@/lib/use-data';

export default function Cobros() {
  const negocio = useNegocio();
  const toast = useToast();

  const { data, error, loading, refreshing, refresh, reload } = useData(async () => {
    const [pagos, dash] = await Promise.all([
      supabase
        .from('pagos')
        .select('id,cliente_id,deuda_id,monto,fecha,metodo,nota,created_at,clientes(nombres)')
        .eq('negocio_id', negocio.id)
        .order('fecha', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(60),
      supabase.from('v_dashboard').select('cobrado_mes').eq('negocio_id', negocio.id).maybeSingle(),
    ]);
    return {
      pagos: must(pagos) as unknown as Pago[],
      cobradoMes: num((must(dash) as { cobrado_mes: number } | null)?.cobrado_mes),
    };
  }, [negocio.id]);

  async function confirmDelete(p: Pago) {
    const nombre = p.clientes?.nombres ?? 'el cliente';
    const ok = await confirm(
      '¿Eliminar pago?',
      `Se eliminará el pago de ${money(p.monto)} de ${nombre} y su saldo volverá a las cuotas.`,
      'Eliminar',
      true,
    );
    if (!ok) return;
    const { error: e } = await supabase.from('pagos').delete().eq('id', p.id);
    if (e) toast.error(e);
    else {
      toast.show('Pago eliminado');
      reload();
    }
  }

  // agrupa por fecha
  const groups: { fecha: string; items: Pago[]; total: number }[] = [];
  for (const p of data?.pagos ?? []) {
    const g = groups[groups.length - 1];
    if (g && g.fecha === p.fecha) {
      g.items.push(p);
      g.total += num(p.monto);
    } else groups.push({ fecha: p.fecha, items: [p], total: num(p.monto) });
  }

  return (
    <Screen
      refreshing={refreshing}
      onRefresh={refresh}
      footer={<Button title="Registrar pago" icon="add" onPress={() => router.push('/pago/nuevo')} />}>
      <T variant="h1" style={{ marginTop: 10, marginBottom: 14 }} accessibilityRole="header">
        Cobros
      </T>
      {loading ? (
        <Loading />
      ) : error && !data ? (
        <ErrorBox message={error} onRetry={reload} />
      ) : (
        <>
          <Soft>
            <T variant="muted" style={{ fontFamily: F.medium }}>
              Cobrado en {monthLong()}
            </T>
            <BigMoney value={data?.cobradoMes} size={38} color={C.verde} style={{ marginTop: 4 }} />
          </Soft>

          {groups.length === 0 ? (
            <Empty
              icon="cash-outline"
              title="Todavía no hay cobros"
              text="Cuando un cliente te pague, regístralo aquí y se descontará de su deuda."
            />
          ) : (
            groups.map((g) => (
              <View key={g.fecha}>
                <Between style={{ marginTop: 22, marginBottom: 10, paddingHorizontal: 2 }}>
                  <T variant="section">{dateShort(g.fecha)}</T>
                  <T variant="small" style={{ fontVariant: ['tabular-nums'] }}>
                    {plural(g.items.length, 'pago', 'pagos')} por {money(g.total)}
                  </T>
                </Between>
                <Card style={{ paddingVertical: 2, paddingHorizontal: 14 }}>
                  {g.items.map((p, i) => (
                    <Press
                      key={p.id}
                      scaleTo={0.985}
                      accessibilityRole="button"
                      accessibilityLabel={`${p.clientes?.nombres ?? ''}, ${money(p.monto)}, ${metodoLabel(p.metodo)}. Mantén presionado para eliminar.`}
                      onPress={() => router.push(`/cliente/${p.cliente_id}`)}
                      onLongPress={() => confirmDelete(p)}
                      style={[styles.row, i < g.items.length - 1 && styles.border]}>
                      <Avatar name={p.clientes?.nombres ?? '?'} size={40} />
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <T style={{ fontFamily: F.semibold }} numberOfLines={1}>
                          {p.clientes?.nombres ?? 'Cliente'}
                        </T>
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
              </View>
            ))
          )}
          {groups.length > 0 && (
            <T variant="small" style={{ textAlign: 'center', marginTop: 16 }}>
              Mantén presionado un pago para eliminarlo.
            </T>
          )}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, minHeight: 64 },
  border: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.borde },
});
