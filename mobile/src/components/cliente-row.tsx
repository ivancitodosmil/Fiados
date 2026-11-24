import { StyleSheet, View } from 'react-native';

import { money, num } from '@/lib/format';
import { C, F } from '@/lib/theme';
import { clienteStatus, type ClienteResumen } from '@/lib/types';

import { Avatar, Press, StatusTag, T, WhatsAppButton } from './ui';

export function ClienteRow({
  c,
  onPress,
  onWhatsApp,
  sending,
  last,
}: {
  c: ClienteResumen;
  onPress: () => void;
  onWhatsApp?: () => void;
  sending?: boolean;
  last?: boolean;
}) {
  const st = clienteStatus(c);
  const vencido = st.estado === 'rojo' && num(c.total_vencido) > 0;
  return (
    <View style={[styles.row, !last && styles.border]}>
      <Press
        onPress={onPress}
        scaleTo={0.985}
        accessibilityRole="button"
        accessibilityLabel={`${c.nombres}, debe ${money(c.saldo_total)}, ${st.label}${st.detail ? `, ${st.detail}` : ''}`}
        style={styles.main}>
        <Avatar name={c.nombres} />
        <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
          <T style={styles.name} numberOfLines={1}>
            {c.nombres}
          </T>
          {st.detail ? (
            <T variant="small" numberOfLines={1}>
              {st.detail.charAt(0).toUpperCase() + st.detail.slice(1)}
            </T>
          ) : null}
        </View>
        <View style={{ alignItems: 'flex-end', gap: 5 }}>
          <T variant="num" style={{ fontSize: 17, color: vencido ? C.vencido : C.tinta }}>
            {money(c.saldo_total)}
          </T>
          <StatusTag estado={st.estado} label={st.label} />
        </View>
      </Press>
      {onWhatsApp ? (
        <WhatsAppButton onPress={onWhatsApp} loading={sending} label={`Enviar recordatorio por WhatsApp a ${c.nombres}`} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 76 },
  border: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.borde },
  main: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  name: { fontFamily: F.semibold, fontSize: 16 },
});
