import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { dateLong, fromISODate, parseDateInput, toISODate } from '@/lib/format';
import { C, F, R } from '@/lib/theme';

import { Button, Field, Ionicons } from './ui';

type Props = {
  label: string;
  value: string | null; // yyyy-mm-dd
  onChange: (iso: string | null) => void;
  optional?: boolean;
  minimumDate?: string;
  maximumDate?: string;
  style?: StyleProp<ViewStyle>;
  error?: string | null;
};

/** Campo de fecha: selector nativo en iOS/Android, texto dd/mm/aaaa en la web. */
export function DateField(props: Props) {
  if (Platform.OS === 'web') return <WebDateField {...props} />;
  return <NativeDateField {...props} />;
}

function WebDateField({ label, value, onChange, style, error, optional }: Props) {
  const [text, setText] = useState(value ? dateLong(value) : '');
  const [bad, setBad] = useState(false);
  return (
    <Field
      label={label}
      style={style}
      value={text}
      placeholder="dd/mm/aaaa"
      inputMode="numeric"
      maxLength={10}
      error={error ?? (bad ? 'Usa el formato dd/mm/aaaa' : null)}
      onChangeText={(t) => {
        setText(t);
        if (!t.trim() && optional) {
          setBad(false);
          onChange(null);
          return;
        }
        const iso = parseDateInput(t);
        setBad(!iso && t.length >= 10);
        if (iso) onChange(iso);
      }}
    />
  );
}

function NativeDateField({ label, value, onChange, optional, minimumDate, maximumDate, style, error }: Props) {
  const [iosOpen, setIosOpen] = useState(false);
  const [draft, setDraft] = useState<Date>(fromISODate(value) ?? new Date());
  const min = fromISODate(minimumDate) ?? undefined;
  const max = fromISODate(maximumDate) ?? undefined;

  const open = () => {
    const current = fromISODate(value) ?? new Date();
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: current,
        mode: 'date',
        minimumDate: min,
        maximumDate: max,
        onValueChange: (_e, d) => onChange(toISODate(d)),
      });
    } else {
      setDraft(current);
      setIosOpen(true);
    }
  };

  return (
    <View style={style}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value ? dateLong(value) : 'sin fecha'}`}
        onPress={open}
        style={[styles.box, !!error && { borderColor: C.bad }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>{label}</Text>
          <Text style={[styles.value, !value && { color: C.grisSuave }]}>{value ? dateLong(value) : 'Elegir fecha'}</Text>
        </View>
        {optional && value ? (
          <Pressable accessibilityLabel="Quitar fecha" hitSlop={10} onPress={() => onChange(null)}>
            <Ionicons name="close-circle" size={20} color={C.grisSuave} />
          </Pressable>
        ) : (
          <Ionicons name="calendar-outline" size={20} color={C.gris} />
        )}
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {Platform.OS === 'ios' && (
        <Modal visible={iosOpen} transparent animationType="slide" onRequestClose={() => setIosOpen(false)}>
          <Pressable style={styles.backdrop} onPress={() => setIosOpen(false)} accessibilityLabel="Cerrar" />
          <View style={styles.sheet}>
            <DateTimePicker
              value={draft}
              mode="date"
              display="inline"
              locale="es-EC"
              accentColor={C.verde}
              minimumDate={min}
              maximumDate={max}
              onValueChange={(_e, d) => setDraft(d)}
            />
            <Button
              title="Listo"
              onPress={() => {
                onChange(toISODate(draft));
                setIosOpen(false);
              }}
            />
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: C.borde,
    borderRadius: R.field,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  label: { fontFamily: F.body, fontSize: 12, color: C.gris },
  value: { fontFamily: F.medium, fontSize: 17, color: C.tinta, marginTop: 4, fontVariant: ['tabular-nums'] },
  error: { color: C.bad, fontFamily: F.medium, fontSize: 13, marginTop: 6, marginLeft: 4 },
  backdrop: { flex: 1, backgroundColor: 'rgba(24,40,42,0.35)' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    paddingBottom: 36,
    gap: 12,
  },
});
