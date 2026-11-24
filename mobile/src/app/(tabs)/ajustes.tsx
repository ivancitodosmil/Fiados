import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Brand } from '@/components/brand';
import { Screen } from '@/components/screen';
import { Button, Card, Chip, ErrorBox, Field, Ionicons, Loading, Press, Row, SectionTitle, T } from '@/components/ui';
import { confirm } from '@/lib/confirm';
import { num } from '@/lib/format';
import { useNegocio, useSession } from '@/lib/session';
import { supabase } from '@/lib/supabase';
import { C, F } from '@/lib/theme';
import { useToast } from '@/lib/toast';
import type { Apartado } from '@/lib/types';
import { must, useData } from '@/lib/use-data';

const PLACEHOLDERS = ['{cliente}', '{negocio}', '{total}', '{detalle}', '{link}'];
const PLANTILLA_DEFECTO =
  'Hola {cliente}, te saluda {negocio}. Tu saldo pendiente es {total}. {detalle} Puedes ver tu detalle aquí: {link} ¡Gracias!';

export default function Ajustes() {
  const negocio = useNegocio();
  const { session, reloadNegocio, signOut } = useSession();
  const toast = useToast();

  const [nombre, setNombre] = useState(negocio.nombre);
  const [telefono, setTelefono] = useState(negocio.telefono ?? '');
  const [logoUrl, setLogoUrl] = useState(negocio.logo_url ?? '');
  const [diasCredito, setDiasCredito] = useState(String(negocio.dias_credito));
  const [diasAviso, setDiasAviso] = useState(String(negocio.dias_aviso));
  const [plantilla, setPlantilla] = useState(negocio.plantilla_recordatorio);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const apartados = useData(async () => {
    const res = await supabase.from('apartados').select('*').eq('negocio_id', negocio.id).order('nombre');
    return must(res) as Apartado[];
  }, [negocio.id]);

  const dirty =
    nombre !== negocio.nombre ||
    telefono !== (negocio.telefono ?? '') ||
    logoUrl !== (negocio.logo_url ?? '') ||
    diasCredito !== String(negocio.dias_credito) ||
    diasAviso !== String(negocio.dias_aviso) ||
    plantilla !== negocio.plantilla_recordatorio;

  async function save() {
    const e: Record<string, string> = {};
    const dc = Number(diasCredito);
    const da = Number(diasAviso);
    if (!nombre.trim()) e.nombre = 'El nombre es obligatorio';
    if (!Number.isInteger(dc) || dc < 1 || dc > 365) e.diasCredito = 'Entre 1 y 365 días';
    if (!Number.isInteger(da) || da < 0 || da > 60) e.diasAviso = 'Entre 0 y 60 días';
    if (!plantilla.trim()) e.plantilla = 'Escribe el mensaje';
    if (logoUrl.trim() && !/^https?:\/\//.test(logoUrl.trim())) e.logoUrl = 'Debe empezar con https://';
    setErrors(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    const { error } = await supabase
      .from('negocios')
      .update({
        nombre: nombre.trim(),
        telefono: telefono.trim() || null,
        logo_url: logoUrl.trim() || null,
        dias_credito: dc,
        dias_aviso: da,
        plantilla_recordatorio: plantilla.trim(),
      })
      .eq('id', negocio.id);
    setSaving(false);
    if (error) return toast.error(error);
    await reloadNegocio();
    toast.show('Cambios guardados');
  }

  async function logout() {
    if (await confirm('¿Cerrar sesión?', 'Tendrás que ingresar de nuevo con tu correo y contraseña.', 'Cerrar sesión', true)) {
      await signOut();
    }
  }

  return (
    <Screen refreshing={apartados.refreshing} onRefresh={apartados.refresh}>
      <T variant="h1" style={{ marginTop: 10 }} accessibilityRole="header">
        Ajustes
      </T>

      <SectionTitle>Negocio</SectionTitle>
      <View style={{ gap: 12 }}>
        <Field label="Nombre del negocio" value={nombre} onChangeText={setNombre} error={errors.nombre} autoCapitalize="words" />
        <Field
          label="Teléfono / WhatsApp del negocio"
          value={telefono}
          onChangeText={setTelefono}
          keyboardType="phone-pad"
          placeholder="099 123 4567"
          hint="Tus clientes lo verán en su portal para contactarte."
        />
        <Field
          label="Logo (URL de imagen)"
          value={logoUrl}
          onChangeText={setLogoUrl}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          placeholder="https://…"
          error={errors.logoUrl}
        />
        <Row style={{ alignItems: 'flex-start', gap: 10 }}>
          <Field
            style={{ flex: 1 }}
            label="Días de crédito"
            value={diasCredito}
            onChangeText={(t) => setDiasCredito(t.replace(/\D/g, ''))}
            keyboardType="number-pad"
            error={errors.diasCredito}
            hint="Plazo del pago único"
          />
          <Field
            style={{ flex: 1 }}
            label="Avisar antes (días)"
            value={diasAviso}
            onChangeText={(t) => setDiasAviso(t.replace(/\D/g, ''))}
            keyboardType="number-pad"
            error={errors.diasAviso}
            hint="Pasa a amarillo"
          />
        </Row>
      </View>

      <SectionTitle>Mensaje de recordatorio</SectionTitle>
      <Field
        label="Plantilla"
        value={plantilla}
        onChangeText={setPlantilla}
        multiline
        error={errors.plantilla}
        inputStyle={{ fontFamily: F.body, fontSize: 16, lineHeight: 22, minHeight: 120 }}
      />
      <T variant="small" style={{ marginTop: 10, marginBottom: 8 }}>
        Toca para agregar un dato al final del mensaje:
      </T>
      <View style={styles.wrap}>
        {PLACEHOLDERS.map((p) => (
          <Chip key={p} label={p} onPress={() => setPlantilla((s) => `${s.trimEnd()} ${p}`)} />
        ))}
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={() => setPlantilla(PLANTILLA_DEFECTO)}
        style={{ minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' }}>
        <T style={{ color: C.verde, fontFamily: F.semibold, fontSize: 15 }}>Restaurar mensaje original</T>
      </Pressable>

      <Button title="Guardar cambios" onPress={save} loading={saving} disabled={!dirty} style={{ marginTop: 8 }} />

      <SectionTitle
        right={
          <Pressable accessibilityRole="button" onPress={() => router.push('/apartado')} hitSlop={10} style={{ minHeight: 44, justifyContent: 'center' }}>
            <T style={{ color: C.verde, fontFamily: F.semibold, fontSize: 15 }}>+ Agregar</T>
          </Pressable>
        }
        style={{ marginTop: 32 }}>
        Apartados
      </SectionTitle>
      <T variant="small" style={{ marginBottom: 12, marginTop: -4 }}>
        Separa las deudas por tipo (ropa, víveres…) con su interés por defecto.
      </T>
      {apartados.loading ? (
        <Loading />
      ) : apartados.error && !apartados.data ? (
        <ErrorBox message={apartados.error} onRetry={apartados.reload} />
      ) : (
        <Card style={{ paddingVertical: 2, paddingHorizontal: 14 }}>
          <View style={[styles.apRow, styles.border]}>
            <View style={[styles.swatch, { backgroundColor: C.track }]} />
            <View style={{ flex: 1 }}>
              <T style={{ fontFamily: F.semibold }}>General</T>
              <T variant="small">Sin apartado, sin interés</T>
            </View>
          </View>
          {(apartados.data ?? []).map((a, i, arr) => (
            <Press
              key={a.id}
              scaleTo={0.985}
              accessibilityRole="button"
              accessibilityLabel={`Editar apartado ${a.nombre}, ${num(a.tasa_interes)}% de interés`}
              onPress={() => router.push({ pathname: '/apartado', params: { id: a.id } })}
              style={[styles.apRow, i < arr.length - 1 && styles.border]}>
              <View style={[styles.swatch, { backgroundColor: a.color || C.verdeClaro }]} />
              <View style={{ flex: 1 }}>
                <T style={{ fontFamily: F.semibold }}>{a.nombre}</T>
                <T variant="small">{num(a.tasa_interes)}% de interés por defecto</T>
              </View>
              <Ionicons name="chevron-forward" size={20} color={C.grisSuave} />
            </Press>
          ))}
        </Card>
      )}

      <SectionTitle style={{ marginTop: 32 }}>Cuenta</SectionTitle>
      <Card>
        <T variant="small">Sesión iniciada como</T>
        <T style={{ fontFamily: F.semibold, marginTop: 2 }} numberOfLines={1}>
          {session?.user.email}
        </T>
        <Button title="Cerrar sesión" variant="danger" icon="log-out-outline" onPress={logout} style={{ marginTop: 14 }} />
      </Card>

      <View style={{ alignItems: 'center', marginTop: 32, opacity: 0.9 }}>
        <Brand />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 6 },
  apRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, minHeight: 64 },
  border: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.borde },
  swatch: { width: 28, height: 28, borderRadius: 14 },
});
