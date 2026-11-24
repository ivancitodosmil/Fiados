import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ClienteRow } from '@/components/cliente-row';
import { MAX_W } from '@/components/screen';
import { Between, Button, Card, Chip, Empty, ErrorBox, Field, Ionicons, Loading, Press, T } from '@/components/ui';
import { money, num } from '@/lib/format';
import { useReminder } from '@/lib/reminder';
import { useNegocio } from '@/lib/session';
import { supabase } from '@/lib/supabase';
import { C, F, shadowCard } from '@/lib/theme';
import type { ClienteResumen } from '@/lib/types';
import { must, useData } from '@/lib/use-data';

type Filtro = 'todos' | 'rojo' | 'amarillo' | 'verde' | 'inactivos';
const FILTROS: { value: Filtro; label: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'rojo', label: 'Vencidos' },
  { value: 'amarillo', label: 'Por vencer' },
  { value: 'verde', label: 'Al día' },
  { value: 'inactivos', label: 'Inactivos' },
];

export default function Clientes() {
  const negocio = useNegocio();
  const reminder = useReminder();
  const [q, setQ] = useState('');
  const [filtro, setFiltro] = useState<Filtro>('todos');

  const { data, error, loading, refreshing, refresh, reload } = useData(async () => {
    const res = await supabase.from('v_clientes_resumen').select('*').eq('negocio_id', negocio.id).order('nombres');
    return must(res) as ClienteResumen[];
  }, [negocio.id]);

  const list = useMemo(() => {
    if (!data) return [];
    const t = q.trim().toLowerCase();
    return data.filter((c) => {
      if (filtro === 'inactivos' ? c.activo : !c.activo) return false;
      if (filtro === 'rojo' && !(c.semaforo === 'rojo' && num(c.saldo_total) > 0)) return false;
      if (filtro === 'amarillo' && !(c.semaforo === 'amarillo' && num(c.saldo_total) > 0)) return false;
      if (filtro === 'verde' && c.semaforo !== 'verde') return false;
      if (!t) return true;
      return c.nombres.toLowerCase().includes(t) || (c.cedula ?? '').includes(t) || (c.celular ?? '').includes(t);
    });
  }, [data, q, filtro]);

  const totalLista = list.reduce((s, c) => s + num(c.saldo_total), 0);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.top}>
        <T variant="h1" style={{ marginTop: 10, marginBottom: 14 }} accessibilityRole="header">
          Clientes
        </T>
        <Field
          label="Buscar"
          placeholder="Nombre o cédula"
          value={q}
          onChangeText={setQ}
          autoCorrect={false}
          returnKeyType="search"
          right={<Ionicons name="search" size={20} color={C.grisSuave} />}
        />
      </View>
      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {FILTROS.map((f) => (
            <Chip key={f.value} label={f.label} selected={filtro === f.value} onPress={() => setFiltro(f.value)} />
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <Loading />
      ) : error && !data ? (
        <ErrorBox message={error} onRetry={reload} />
      ) : (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={C.verde} colors={[C.verde]} />}>
          {list.length > 0 ? (
            <>
              <Between style={{ marginBottom: 10, paddingHorizontal: 2 }}>
                <T variant="small">{list.length === 1 ? '1 cliente' : `${list.length} clientes`}</T>
                <T variant="small" style={{ fontVariant: ['tabular-nums'] }}>
                  Deben {money(totalLista)}
                </T>
              </Between>
              <Card style={{ paddingVertical: 2, paddingHorizontal: 14 }}>
                {list.map((item, index) => (
                  <ClienteRow
                    key={item.id}
                    c={item}
                    last={index === list.length - 1}
                    onPress={() => router.push(`/cliente/${item.id}`)}
                    onWhatsApp={num(item.saldo_total) > 0 && item.activo ? () => reminder.send(item.id) : undefined}
                    sending={reminder.sendingId === item.id}
                  />
                ))}
              </Card>
            </>
          ) : data && data.length === 0 ? (
            <Empty
              icon="people-outline"
              title="Aún no tienes clientes"
              text="Agrega a las personas a las que les fías para llevar su cuenta."
              action={<Button title="Agregar cliente" icon="add" onPress={() => router.push('/cliente/nuevo')} style={{ paddingHorizontal: 28 }} />}
            />
          ) : (
            <Empty icon="search-outline" title="Sin resultados" text="No hay clientes con ese nombre o en este filtro." />
          )}
        </ScrollView>
      )}

      <Press
        accessibilityRole="button"
        accessibilityLabel="Agregar cliente"
        hapticKind="light"
        onPress={() => router.push('/cliente/nuevo')}
        style={styles.fab}>
        <Ionicons name="add" size={22} color="#fff" />
        <T style={styles.fabText}>Cliente</T>
      </Press>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.blanco },
  top: { paddingHorizontal: 20, width: '100%', maxWidth: MAX_W, alignSelf: 'center' },
  chips: { gap: 8, paddingHorizontal: 20, paddingVertical: 14 },
  listContent: { paddingHorizontal: 20, paddingTop: 2, paddingBottom: 110, width: '100%', maxWidth: MAX_W, alignSelf: 'center', flexGrow: 1 },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    height: 56,
    paddingHorizontal: 22,
    borderRadius: 999,
    backgroundColor: C.verde,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    ...shadowCard,
    boxShadow: '0px 10px 24px -8px rgba(47,109,95,0.55)',
  },
  fabText: { color: '#fff', fontFamily: F.semibold, fontSize: 16 },
});
