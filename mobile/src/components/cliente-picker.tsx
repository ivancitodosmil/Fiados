import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { useSession } from '@/lib/session';
import { supabase } from '@/lib/supabase';
import type { ClienteResumen } from '@/lib/types';
import { must, useData } from '@/lib/use-data';

import { ClienteRow } from './cliente-row';
import { Screen } from './screen';
import { Button, Card, Empty, ErrorBox, Field, Header, Ionicons, Loading, T } from './ui';

/** Paso previo de Nuevo fiado / Registrar pago cuando no viene un cliente elegido. */
export function ClientePicker({
  title,
  subtitle,
  onPick,
  soloConDeuda,
}: {
  title: string;
  subtitle: string;
  onPick: (id: string) => void;
  soloConDeuda?: boolean;
}) {
  const { negocio } = useSession();
  const [q, setQ] = useState('');
  const { data, error, loading, refreshing, refresh, reload } = useData(async () => {
    let query = supabase
      .from('v_clientes_resumen')
      .select('*')
      .eq('negocio_id', negocio!.id)
      .eq('activo', true)
      .order('nombres');
    if (soloConDeuda) query = query.gt('saldo_total', 0);
    return must(await query) as ClienteResumen[];
  }, [negocio?.id, soloConDeuda]);

  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!data) return [];
    if (!t) return data;
    return data.filter((c) => c.nombres.toLowerCase().includes(t) || (c.cedula ?? '').includes(t));
  }, [data, q]);

  return (
    <Screen header={<Header title={title} left="cancel" />} refreshing={refreshing} onRefresh={refresh}>
      <T variant="muted" style={{ textAlign: 'center', marginBottom: 14 }}>
        {subtitle}
      </T>
      <Field
        label="Buscar"
        placeholder="Nombre o cédula"
        value={q}
        onChangeText={setQ}
        autoCorrect={false}
        right={<Ionicons name="search" size={20} color="#8A9897" />}
      />
      <View style={{ height: 14 }} />
      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorBox message={error} onRetry={reload} />
      ) : list.length === 0 ? (
        <Empty
          icon="people-outline"
          title={q ? 'Sin resultados' : soloConDeuda ? 'Nadie te debe' : 'Aún no tienes clientes'}
          text={q ? 'Prueba con otro nombre o cédula.' : soloConDeuda ? 'No hay clientes con saldo pendiente.' : 'Agrega tu primer cliente para empezar.'}
          action={!q && !soloConDeuda ? <Button title="Agregar cliente" icon="add" onPress={() => router.push('/cliente/nuevo')} style={{ paddingHorizontal: 28 }} /> : null}
        />
      ) : (
        <Card style={{ paddingVertical: 2, paddingHorizontal: 14 }}>
          {list.map((c, i) => (
            <ClienteRow key={c.id} c={c} last={i === list.length - 1} onPress={() => onPick(c.id)} />
          ))}
        </Card>
      )}
    </Screen>
  );
}
