import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { parseAmount } from '@/lib/format';
import { useNegocio } from '@/lib/session';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/lib/toast';
import type { Cliente } from '@/lib/types';

import { DateField } from './date-field';
import { Screen } from './screen';
import { Button, Field, Header, SectionTitle } from './ui';

export function ClienteForm({ initial }: { initial?: Cliente }) {
  const negocio = useNegocio();
  const toast = useToast();
  const [nombres, setNombres] = useState(initial?.nombres ?? '');
  const [cedula, setCedula] = useState(initial?.cedula ?? '');
  const [celular, setCelular] = useState(initial?.celular ?? '');
  const [email, setEmail] = useState(initial?.email ?? '');
  const [direccion, setDireccion] = useState(initial?.direccion ?? '');
  const [nacimiento, setNacimiento] = useState<string | null>(initial?.fecha_nacimiento ?? null);
  const [limite, setLimite] = useState(initial?.limite_credito != null ? String(initial.limite_credito) : '');
  const [notas, setNotas] = useState(initial?.notas ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  async function save() {
    const e: Record<string, string> = {};
    if (!nombres.trim()) e.nombres = 'El nombre es obligatorio';
    if (cedula && !/^\d{10}$/.test(cedula)) e.cedula = 'La cédula debe tener 10 dígitos';
    const cel = celular.replace(/\D/g, '');
    if (cel && (cel.length < 9 || cel.length > 12)) e.celular = 'Revisa el número (ej. 0991234567)';
    if (email.trim() && !/^\S+@\S+\.\S+$/.test(email.trim())) e.email = 'Correo no válido';
    const lim = limite.trim() ? parseAmount(limite) : null;
    if (limite.trim() && (lim == null || lim < 0)) e.limite = 'Monto no válido';
    setErrors(e);
    if (Object.keys(e).length) {
      toast.show('Revisa los campos marcados', 'error');
      return;
    }

    setSaving(true);
    const row = {
      nombres: nombres.trim().replace(/\s+/g, ' '),
      cedula: cedula || null,
      celular: cel || null,
      email: email.trim() || null,
      direccion: direccion.trim() || null,
      fecha_nacimiento: nacimiento,
      limite_credito: lim,
      notas: notas.trim() || null,
    };
    if (initial) {
      const { error } = await supabase.from('clientes').update(row).eq('id', initial.id);
      setSaving(false);
      if (error) return toast.error(error);
      toast.show('Cliente actualizado');
      router.back();
    } else {
      const { data, error } = await supabase
        .from('clientes')
        .insert({ ...row, negocio_id: negocio.id })
        .select('id')
        .single();
      setSaving(false);
      if (error) return toast.error(error);
      toast.show('Cliente agregado');
      router.replace(`/cliente/${(data as { id: string }).id}`);
    }
  }

  return (
    <Screen
      header={<Header title={initial ? 'Editar cliente' : 'Nuevo cliente'} left="cancel" />}
      footer={<Button title={initial ? 'Guardar cambios' : 'Guardar cliente'} onPress={save} loading={saving} />}>
      <View style={{ gap: 12, paddingTop: 8 }}>
        <Field
          label="Nombres y apellidos *"
          placeholder="Juan Pérez"
          value={nombres}
          onChangeText={setNombres}
          autoCapitalize="words"
          autoComplete="name"
          error={errors.nombres}
        />
        <Field
          label="Cédula"
          placeholder="10 dígitos"
          value={cedula}
          onChangeText={(t) => setCedula(t.replace(/\D/g, '').slice(0, 10))}
          keyboardType="number-pad"
          maxLength={10}
          error={errors.cedula}
          hint={cedula && cedula.length < 10 ? `${cedula.length}/10 dígitos` : undefined}
        />
        <Field
          label="Celular (WhatsApp)"
          placeholder="099 123 4567"
          value={celular}
          onChangeText={setCelular}
          keyboardType="phone-pad"
          autoComplete="tel"
          error={errors.celular}
        />
      </View>

      <SectionTitle>Más datos (opcional)</SectionTitle>
      <View style={{ gap: 12 }}>
        <Field
          label="Límite de crédito ($)"
          placeholder="Sin límite"
          value={limite}
          onChangeText={setLimite}
          keyboardType="decimal-pad"
          error={errors.limite}
        />
        <Field
          label="Correo"
          placeholder="cliente@correo.com"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          error={errors.email}
        />
        <Field label="Dirección" value={direccion} onChangeText={setDireccion} autoCapitalize="sentences" />
        <DateField label="Fecha de nacimiento" value={nacimiento} onChange={setNacimiento} optional maximumDate={undefined} />
        <Field label="Notas" value={notas} onChangeText={setNotas} multiline autoCapitalize="sentences" />
      </View>
    </Screen>
  );
}
