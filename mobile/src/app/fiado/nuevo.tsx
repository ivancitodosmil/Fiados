import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';

import { ClientePicker } from '@/components/cliente-picker';
import { DateField } from '@/components/date-field';
import { Screen } from '@/components/screen';
import { Between, Button, Chip, Field, Header, IconButton, Ionicons, Row, Segmented, Soft, T } from '@/components/ui';
import { addDays, dateShort, money, num, parseAmount, plural, today } from '@/lib/format';
import { useNegocio } from '@/lib/session';
import { errorMessage, supabase } from '@/lib/supabase';
import { C, F, tabular } from '@/lib/theme';
import { useToast } from '@/lib/toast';
import { FRECUENCIAS, type Apartado, type ClienteResumen, type Frecuencia, type Simulacion } from '@/lib/types';

type Modo = 'unico' | 'fechas' | 'cuotas';
const MODOS = [
  { value: 'unico', label: 'Pago único' },
  { value: 'fechas', label: 'Por fechas' },
  { value: 'cuotas', label: 'N° cuotas' },
] as const;

export default function NuevoFiado() {
  const params = useLocalSearchParams<{ cliente?: string }>();
  const [clienteId, setClienteId] = useState<string | undefined>(params.cliente);
  if (!clienteId) {
    return <ClientePicker title="Nuevo fiado" subtitle="¿A quién le fías?" onPick={setClienteId} />;
  }
  return <FiadoForm clienteId={clienteId} />;
}

function FiadoForm({ clienteId }: { clienteId: string }) {
  const negocio = useNegocio();
  const toast = useToast();

  const [cliente, setCliente] = useState<ClienteResumen | null>(null);
  const [apartados, setApartados] = useState<Apartado[]>([]);

  const [monto, setMonto] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [apartadoId, setApartadoId] = useState<string | null>(null);
  const [tasa, setTasa] = useState('0');
  const [modo, setModo] = useState<Modo>('unico');
  const [vence, setVence] = useState<string>(addDays(today(), negocio.dias_credito));
  const [inicio, setInicio] = useState<string>(today());
  const [fin, setFin] = useState<string>(addDays(today(), 28));
  const [frecuencia, setFrecuencia] = useState<Frecuencia>('semanal');
  const [nCuotas, setNCuotas] = useState(4);
  const [sinDomingos, setSinDomingos] = useState(false);

  const [sim, setSim] = useState<Simulacion | null>(null);
  const [simError, setSimError] = useState<string | null>(null);
  const [simLoading, setSimLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const seq = useRef(0);

  useEffect(() => {
    Promise.all([
      supabase.from('v_clientes_resumen').select('*').eq('id', clienteId).maybeSingle(),
      supabase.from('apartados').select('*').eq('negocio_id', negocio.id).order('nombre'),
    ]).then(([c, a]) => {
      if (c.error) toast.error(c.error);
      else setCliente(c.data as ClienteResumen);
      if (!a.error) setApartados(a.data as Apartado[]);
    });
  }, [clienteId, negocio.id, toast]);

  const capital = parseAmount(monto);
  const tasaNum = tasa.trim() === '' ? null : parseAmount(tasa);

  function plan() {
    const base = { p_capital: capital, p_tasa_interes: tasaNum, p_apartado: apartadoId };
    if (modo === 'unico') return { ...base, p_fecha_inicio: today(), p_num_cuotas: 1, p_primer_vencimiento: vence };
    if (modo === 'fechas')
      return { ...base, p_fecha_inicio: inicio, p_fecha_fin: fin, p_frecuencia: frecuencia, p_excluir_domingos: sinDomingos };
    return { ...base, p_fecha_inicio: inicio, p_num_cuotas: nCuotas, p_frecuencia: frecuencia, p_excluir_domingos: sinDomingos };
  }
  const planKey = JSON.stringify(plan());

  // Vista previa con simular_deuda (debounce 400 ms; descarta respuestas viejas)
  useEffect(() => {
    if (!capital || capital <= 0) {
      seq.current++;
      setSim(null);
      setSimError(null);
      setSimLoading(false);
      return;
    }
    const my = ++seq.current;
    setSimLoading(true);
    const t = setTimeout(async () => {
      const { data, error } = await supabase.rpc('simular_deuda', { p_negocio: negocio.id, ...JSON.parse(planKey) });
      if (my !== seq.current) return;
      setSimLoading(false);
      if (error) {
        setSimError(errorMessage(error));
        setSim(null);
      } else {
        setSimError(null);
        setSim(data as Simulacion);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [planKey, capital, negocio.id]);

  function pickApartado(a: Apartado | null) {
    setApartadoId(a?.id ?? null);
    setTasa(String(a ? num(a.tasa_interes) : 0));
  }

  async function save() {
    if (!capital || capital <= 0) return toast.show('Escribe el monto fiado', 'error');
    if (simError) return toast.show(simError, 'error');
    setSaving(true);
    const { error } = await supabase.rpc('crear_deuda', {
      p_cliente: clienteId,
      p_descripcion: descripcion.trim() || null,
      ...plan(),
    });
    setSaving(false);
    if (error) return toast.error(error);
    toast.show('Fiado guardado');
    router.back();
  }

  const sobreLimite = cliente?.credito_disponible != null && sim ? num(sim.total) > num(cliente.credito_disponible) : false;
  const showFreq = modo !== 'unico';

  return (
    <Screen
      header={<Header title="Nuevo fiado" left="cancel" />}
      footer={<Button title="Guardar fiado" onPress={save} loading={saving} disabled={!capital || !!simError} />}>
      <T variant="muted" style={{ textAlign: 'center', marginTop: 4 }} numberOfLines={1}>
        Monto fiado a {cliente?.nombres ?? '…'}
      </T>
      <View style={styles.amountRow}>
        <T style={[styles.amount, { color: monto ? C.tinta : C.grisSuave }]}>$</T>
        <TextInput
          value={monto}
          onChangeText={(t) => setMonto(t.replace(/[^\d.,]/g, ''))}
          placeholder="0.00"
          placeholderTextColor={C.grisSuave}
          keyboardType="decimal-pad"
          inputMode="decimal"
          autoFocus
          accessibilityLabel="Monto fiado en dólares"
          style={[styles.amount, styles.amountInput, { width: amountWidth(monto) }]}
        />
      </View>

      <Field
        label="¿Qué se lleva? (opcional)"
        placeholder="Chompa, víveres de la semana…"
        value={descripcion}
        onChangeText={setDescripcion}
        autoCapitalize="sentences"
      />

      <T variant="label" style={styles.label}>
        Apartado
      </T>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} style={{ marginHorizontal: -20 }}>
        <View style={{ width: 12 }} />
        <Chip label="General" selected={apartadoId === null} onPress={() => pickApartado(null)} />
        {apartados.map((a) => (
          <Chip
            key={a.id}
            label={num(a.tasa_interes) > 0 ? `${a.nombre} ${num(a.tasa_interes)}%` : a.nombre}
            dot={a.color}
            selected={apartadoId === a.id}
            onPress={() => pickApartado(a)}
          />
        ))}
        <View style={{ width: 12 }} />
      </ScrollView>

      <Field
        style={{ marginTop: 12 }}
        label="Interés (%)"
        value={tasa}
        onChangeText={(t) => setTasa(t.replace(/[^\d.,]/g, ''))}
        keyboardType="decimal-pad"
        hint="Se cobra una sola vez sobre el monto. Vacío = interés del apartado."
      />

      <T variant="label" style={styles.label}>
        Forma de pago
      </T>
      <Segmented options={MODOS} value={modo} onChange={setModo} />

      <View style={{ marginTop: 12, gap: 12 }}>
        {modo === 'unico' && (
          <DateField label="Paga el" value={vence} onChange={(v) => v && setVence(v)} minimumDate={today()} />
        )}
        {modo === 'fechas' && (
          <Row style={{ gap: 10 }}>
            <DateField style={{ flex: 1 }} label="Inicio" value={inicio} onChange={(v) => v && setInicio(v)} />
            <DateField style={{ flex: 1 }} label="Fin" value={fin} onChange={(v) => v && setFin(v)} minimumDate={addDays(inicio, 1)} />
          </Row>
        )}
        {modo === 'cuotas' && (
          <Row style={{ gap: 10, alignItems: 'stretch' }}>
            <View style={styles.stepper}>
              <T variant="label" style={{ fontSize: 12, fontFamily: F.body }}>
                N° de cuotas
              </T>
              <Row style={{ gap: 4, justifyContent: 'space-between' }}>
                <IconButton icon="remove" label="Menos cuotas" size={40} bg={C.track} onPress={() => setNCuotas((n) => Math.max(2, n - 1))} />
                <T style={{ fontFamily: F.heading, fontSize: 20, ...tabular }}>{nCuotas}</T>
                <IconButton icon="add" label="Más cuotas" size={40} bg={C.track} onPress={() => setNCuotas((n) => Math.min(400, n + 1))} />
              </Row>
            </View>
            <DateField style={{ flex: 1 }} label="Desde" value={inicio} onChange={(v) => v && setInicio(v)} />
          </Row>
        )}
        {showFreq && <Segmented options={FRECUENCIAS} value={frecuencia} onChange={setFrecuencia} compact />}
        {showFreq && (
          <Between style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <T style={{ fontFamily: F.medium }}>No cobrar domingos</T>
              <T variant="small">
                {frecuencia === 'diaria'
                  ? 'Los domingos se saltan: no se agenda ningún cobro ese día.'
                  : 'Si una fecha cae domingo, se cobra el lunes.'}
              </T>
            </View>
            <Switch
              value={sinDomingos}
              onValueChange={setSinDomingos}
              trackColor={{ true: C.verde, false: C.borde }}
              thumbColor="#fff"
              accessibilityLabel="No cobrar domingos"
            />
          </Between>
        )}
      </View>

      {/* ---------------- vista previa */}
      <Soft style={{ marginTop: 16 }}>
        {!capital ? (
          <T variant="muted" style={{ textAlign: 'center' }}>
            Escribe el monto para ver el plan de pagos.
          </T>
        ) : simError ? (
          <Row style={{ gap: 8 }}>
            <Ionicons name="alert-circle" size={20} color={C.bad} />
            <T style={{ color: C.bad, flex: 1, fontFamily: F.medium }}>{simError}</T>
          </Row>
        ) : !sim ? (
          <ActivityIndicator color={C.verde} />
        ) : (
          <View style={{ opacity: simLoading ? 0.55 : 1 }}>
            <Between>
              <T variant="muted">Capital</T>
              <T variant="num" style={{ fontSize: 16 }}>
                {money(sim.capital)}
              </T>
            </Between>
            <Between style={{ marginTop: 8 }}>
              <T variant="muted">+ Interés {num(sim.tasa_interes)}%</T>
              <T variant="num" style={{ fontSize: 16 }}>
                {money(sim.interes)}
              </T>
            </Between>
            <View style={styles.hr} />
            <Between>
              <T style={{ fontFamily: F.semibold, fontSize: 17 }}>Total</T>
              <T variant="num" style={{ fontSize: 24, color: C.verde }}>
                {money(sim.total)}
              </T>
            </Between>
            <T style={{ fontFamily: F.semibold, fontSize: 16, marginTop: 14, ...tabular }}>
              {sim.num_cuotas === 1
                ? `1 pago el ${dateShort(sim.cuotas[0]?.vence)}`
                : `${plural(sim.num_cuotas, 'cuota', 'cuotas')} de ${money(sim.valor_cuota)}`}
            </T>
            {sim.num_cuotas > 1 && (
              <View style={styles.dates}>
                {sim.cuotas.slice(0, 12).map((q) => (
                  <Chip key={q.numero} small label={dateShort(q.vence)} />
                ))}
                {sim.num_cuotas > 12 && <Chip small label={`+${sim.num_cuotas - 12} más`} />}
              </View>
            )}
            {sim.num_cuotas > 1 && num(sim.cuotas[sim.cuotas.length - 1]?.monto) !== num(sim.valor_cuota) && (
              <T variant="small" style={{ marginTop: 8, ...tabular }}>
                La última cuota es de {money(sim.cuotas[sim.cuotas.length - 1]?.monto)} por el redondeo.
              </T>
            )}
          </View>
        )}
      </Soft>

      {sobreLimite && (
        <Row style={styles.warn}>
          <Ionicons name="warning-outline" size={20} color={C.warn} />
          <T style={{ flex: 1, color: C.warn, fontFamily: F.medium, fontSize: 14, ...tabular }}>
            Supera el crédito disponible de {cliente?.nombres.split(' ')[0]} ({money(cliente?.credito_disponible)}).
          </T>
        </Row>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  amountRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 4, marginBottom: 16 },
  amount: { fontFamily: F.heading, fontSize: 46, color: C.tinta, letterSpacing: -0.9, ...tabular },
  amountInput: { maxWidth: 280, paddingVertical: 4, paddingHorizontal: 4, outlineStyle: 'none' } as object,
  label: { marginTop: 18, marginBottom: 8, marginLeft: 2 },
  stepper: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: C.borde,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 8,
    gap: 2,
  },
  switchRow: { minHeight: 56, paddingHorizontal: 4 },
  hr: { height: 1, backgroundColor: 'rgba(24,40,42,0.08)', marginVertical: 12 },
  dates: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  warn: { marginTop: 12, backgroundColor: C.warnBg, borderRadius: 16, padding: 12, gap: 8 },
});

/** Ancho aproximado del monto (Poppins 46px, cifras tabulares) para que quede centrado junto al "$". */
function amountWidth(text: string) {
  const t = text || '0.00';
  let w = 0;
  for (const ch of t) w += ch === '.' || ch === ',' ? 14 : 29;
  return Math.min(280, w + 12);
}
