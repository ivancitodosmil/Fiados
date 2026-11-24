import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Screen } from '@/components/screen';
import { Button, Field, Header, Ionicons, Loading, T } from '@/components/ui';
import { confirm } from '@/lib/confirm';
import { num, parseAmount } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { useNegocio } from '@/lib/session';
import { supabase } from '@/lib/supabase';
import { APARTADO_COLORES, C } from '@/lib/theme';
import { useToast } from '@/lib/toast';
import type { Apartado } from '@/lib/types';

export default function ApartadoScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const negocio = useNegocio();
  const toast = useToast();
  const [loading, setLoading] = useState(!!id);
  const [nombre, setNombre] = useState('');
  const [color, setColor] = useState<string>(APARTADO_COLORES[0]);
  const [tasa, setTasa] = useState('0');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    supabase
      .from('apartados')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data, error }) => {
        if (error) toast.error(error);
        else {
          const a = data as Apartado;
          setNombre(a.nombre);
          setColor(a.color || APARTADO_COLORES[0]);
          setTasa(String(num(a.tasa_interes)));
        }
        setLoading(false);
      });
  }, [id, toast]);

  async function save() {
    const e: Record<string, string> = {};
    const t = parseAmount(tasa) ?? 0;
    if (!nombre.trim()) e.nombre = 'Escribe un nombre';
    if (t < 0 || t > 1000) e.tasa = 'Entre 0 y 1000 %';
    setErrors(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    const row = { nombre: nombre.trim(), color, tasa_interes: t };
    const { error } = id
      ? await supabase.from('apartados').update(row).eq('id', id)
      : await supabase.from('apartados').insert({ ...row, negocio_id: negocio.id });
    setSaving(false);
    if (error) return toast.error(error);
    toast.show(id ? 'Apartado actualizado' : 'Apartado creado');
    router.back();
  }

  async function remove() {
    const ok = await confirm(
      '¿Eliminar apartado?',
      `Las deudas de "${nombre}" pasarán a General. Esta acción no se puede deshacer.`,
      'Eliminar',
      true,
    );
    if (!ok) return;
    const { error } = await supabase.from('apartados').delete().eq('id', id!);
    if (error) return toast.error(error);
    toast.show('Apartado eliminado');
    router.back();
  }

  return (
    <Screen
      edges={['top']}
      header={<Header title={id ? 'Editar apartado' : 'Nuevo apartado'} left="cancel" />}
      footer={<Button title="Guardar" onPress={save} loading={saving} disabled={loading} />}>
      {loading ? (
        <Loading />
      ) : (
        <View style={{ gap: 14, paddingTop: 8 }}>
          <Field label="Nombre" placeholder="Ropa, Víveres…" value={nombre} onChangeText={setNombre} error={errors.nombre} autoCapitalize="sentences" />
          <Field
            label="Interés por defecto (%)"
            value={tasa}
            onChangeText={setTasa}
            keyboardType="decimal-pad"
            error={errors.tasa}
            hint="Se aplica una vez sobre el monto fiado. Puedes cambiarlo en cada fiado."
          />
          <T variant="label" style={{ marginTop: 6 }}>
            Color
          </T>
          <View style={styles.colors}>
            {APARTADO_COLORES.map((c) => {
              const on = c === color;
              return (
                <Pressable
                  key={c}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  accessibilityLabel={`Color ${c}`}
                  onPress={() => {
                    haptic('select');
                    setColor(c);
                  }}
                  style={[styles.color, { backgroundColor: c }, on && styles.colorOn]}>
                  {on && <Ionicons name="checkmark" size={20} color={c === '#9FD3C5' ? C.tinta : '#fff'} />}
                </Pressable>
              );
            })}
          </View>
          {id ? <Button title="Eliminar apartado" variant="danger" icon="trash-outline" onPress={remove} style={{ marginTop: 18 }} /> : null}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  colors: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  color: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  colorOn: { borderWidth: 3, borderColor: '#fff', boxShadow: '0px 0px 0px 2px #18282A' },
});
