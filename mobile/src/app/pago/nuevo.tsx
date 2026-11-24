import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ClientePicker } from '@/components/cliente-picker';
import { DateField } from '@/components/date-field';
import { Screen } from '@/components/screen';
import { Avatar, Between, Button, Chip, ErrorBox, Field, Header, Loading, Row, Segmented, Soft, T } from '@/components/ui';
import { money, num, parseAmount, today } from '@/lib/format';
import { useNegocio } from '@/lib/session';
import { supabase } from '@/lib/supabase';
import { C, F, tabular } from '@/lib/theme';
import { useToast } from '@/lib/toast';
import { METODOS, type ClienteResumen, type Cuota, type Deuda, type Pago } from '@/lib/types';
import { must, useData } from '@/lib/use-data';

export default function RegistrarPago() {
  const params = useLocalSearchParams<{ cliente?: string; deuda?: string }>();
  const [clienteId, setClienteId] = useState<string | undefined>(params.cliente);
  if (!clienteId) {
    return <ClientePicker title="Registrar pago" subtitle="¿Quién te está pagando?" soloConDeuda onPick={setClienteId} />;
  }
  return <PagoForm clienteId={clienteId} deudaInicial={params.deuda ?? null} />;
}

function PagoForm({ clienteId, deudaInicial }: { clienteId: string; deudaInicial: string | null }) {
  const negocio = useNegocio();
  const toast = useToast();
  const [monto, setMonto] = useState('');
  const [metodo, setMetodo] = useState<Pago['metodo']>('efectivo');
  const [deudaId, setDeudaId] = useState<string | null>(deudaInicial);
  const [fecha, setFecha] = useState<string>(today());
  const [nota, setNota] = useState('');
  const [saving, setSaving] = useState(false);

  const { data, error, loading, reload } = useData(async () => {
    const [c, d, q] = await Promise.all([
      supabase.from('v_clientes_resumen').select('*').eq('id', clienteId).single(),
      supabase.from('v_deudas').select('*').eq('cliente_id', clienteId).gt('saldo', 0).order('fecha'),
      supabase.from('v_cuotas').select('*').eq('cliente_id', clienteId).gt('saldo', 0).order('fecha_vencimiento'),
    ]);
    return { cliente: must(c) as ClienteResumen, deudas: must(d) as Deuda[], cuotas: must(q) as Cuota[] };
  }, [clienteId]);

  if (loading || !data) {
    return (
      <Screen header={<Header title="Registrar pago" left="cancel" />}>
        {loading ? <Loading /> : <ErrorBox message={error ?? 'No se pudo cargar'} onRetry={reload} />}
      </Screen>
    );
  }

  const { cliente, deudas, cuotas } = data;
  const deuda = deudas.find((d) => d.id === deudaId) ?? null;
  const pend = cuotas.filter((q) => !deuda || q.deuda_id === deuda.id);
  const saldo = deuda ? num(deuda.saldo) : num(cliente.saldo_total);
  const vencido = pend.filter((q) => q.estado === 'vencida').reduce((s, q) => s + num(q.saldo), 0);
  const proxima = pend[0];
  const value = parseAmount(monto);

  async function save() {
    if (!value || value <= 0) return toast.show('Escribe el monto del pago', 'error');
    if (value > saldo + 0.001) return toast.show(`El pago supera el saldo pendiente (${money(saldo)})`, 'error');
    setSaving(true);
    const { error: e } = await supabase.from('pagos').insert({
      negocio_id: negocio.id,
      cliente_id: clienteId,
      deuda_id: deudaId,
      monto: value,
      metodo,
      fecha,
      nota: nota.trim() || null,
    });
    setSaving(false);
    if (e) return toast.error(e);
    toast.show(`Pago de ${money(value)} registrado`);
    router.back();
  }

  const fill = (n: number) => setMonto(n.toFixed(2));

  return (
    <Screen
      header={<Header title="Registrar pago" left="cancel" />}
      footer={<Button title={value ? `Registrar ${money(value)}` : 'Registrar pago'} onPress={save} loading={saving} disabled={!value} />}>
      <Row style={{ marginTop: 4 }}>
        <Avatar name={cliente.nombres} size={40} />
        <View style={{ flex: 1 }}>
          <T style={{ fontFamily: F.semibold }} numberOfLines={1}>
            {cliente.nombres}
          </T>
          <T variant="small" style={tabular}>
            Debe {money(cliente.saldo_total)}
          </T>
          {num(cliente.total_vencido) > 0 ? (
            <T variant="small" style={[tabular, { color: C.vencido }]}>
              {money(cliente.total_vencido)} vencido
            </T>
          ) : null}
        </View>
      </Row>

      <View style={styles.amountRow}>
        <T style={[styles.amount, { color: monto ? C.tinta : C.grisSuave }]}>$</T>
        <TextInput
          value={monto}
          onChangeText={(t) => setMonto(t.replace(/[^\d.,]/g, ''))}
          placeholder="0.00"
          placeholderTextColor={C.grisSuave}
          keyboardType="decimal-pad"
          inputMode="decimal"
          accessibilityLabel="Monto del pago en dólares"
          style={[styles.amount, styles.amountInput, { width: amountWidth(monto) }]}
        />
      </View>

      <Row style={{ gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
        {vencido > 0 ? (
          <Chip label={`Pagar vencido ${money(vencido)}`} onPress={() => fill(vencido)} />
        ) : proxima ? (
          <Chip label={`Próxima cuota ${money(proxima.saldo)}`} onPress={() => fill(num(proxima.saldo))} />
        ) : null}
        {saldo > 0 && <Chip label={`Pagar todo ${money(saldo)}`} onPress={() => fill(saldo)} />}
      </Row>

      <T variant="label" style={styles.label}>
        Método
      </T>
      <Segmented options={METODOS} value={metodo} onChange={setMetodo} compact />

      {deudas.length > 1 && (
        <>
          <T variant="label" style={styles.label}>
            Aplicar a
          </T>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} style={{ marginHorizontal: -20 }}>
            <View style={{ width: 12 }} />
            <Chip label="Lo más antiguo" selected={deudaId === null} onPress={() => setDeudaId(null)} />
            {deudas.map((d) => (
              <Chip
                key={d.id}
                label={`${d.descripcion || d.apartado} ${money(d.saldo)}`}
                selected={deudaId === d.id}
                onPress={() => setDeudaId(d.id)}
              />
            ))}
            <View style={{ width: 12 }} />
          </ScrollView>
        </>
      )}

      <View style={{ gap: 12, marginTop: 18 }}>
        <DateField label="Fecha del pago" value={fecha} onChange={(v) => v && setFecha(v)} maximumDate={today()} />
        <Field label="Nota (opcional)" value={nota} onChangeText={setNota} placeholder="Ej. abono en efectivo" autoCapitalize="sentences" />
      </View>

      {value && value > 0 ? (
        <Soft style={{ marginTop: 16, paddingVertical: 16 }}>
          <Between>
            <T variant="muted">Saldo después del pago</T>
            <T variant="num" style={{ color: value > saldo + 0.001 ? C.vencido : C.verde }}>
              {value > saldo + 0.001 ? 'Supera la deuda' : money(Math.max(0, saldo - value))}
            </T>
          </Between>
          <T variant="small" style={{ marginTop: 6 }}>
            Se aplica primero a la cuota más antigua{deuda ? ' de este fiado' : ''}.
          </T>
        </Soft>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  amountRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 18, marginBottom: 10 },
  amount: { fontFamily: F.heading, fontSize: 46, color: C.tinta, letterSpacing: -0.9, ...tabular },
  amountInput: { maxWidth: 280, paddingVertical: 4, paddingHorizontal: 4, outlineStyle: 'none' } as object,
  label: { marginTop: 20, marginBottom: 8, marginLeft: 2 },
});

/** Ancho aproximado del monto (Poppins 46px, cifras tabulares) para que quede centrado junto al "$". */
function amountWidth(text: string) {
  const t = text || '0.00';
  let w = 0;
  for (const ch of t) w += ch === '.' || ch === ',' ? 14 : 29;
  return Math.min(280, w + 12);
}
