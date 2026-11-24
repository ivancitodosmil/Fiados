import { Image, StyleSheet, Text, View } from 'react-native';

import { C, F } from '@/lib/theme';

/** Logo "Fiados" con la etiqueta "por Predir". */
export function Brand({ size = 'md' }: { size?: 'md' | 'lg' }) {
  const lg = size === 'lg';
  const mark = lg ? 56 : 40;
  return (
    <View style={styles.row} accessible accessibilityLabel="Fiados, por Predir">
      <Image
        source={require('@/assets/images/icon.png')}
        style={{ width: mark, height: mark, borderRadius: mark * 0.3 }}
      />
      <View>
        <Text style={[styles.name, lg && { fontSize: 30, lineHeight: 36 }]}>Fiados</Text>
        <View style={styles.por}>
          <Text style={styles.porText}>por</Text>
          <Image
            source={require('@/assets/brand/predir-color.png')}
            style={{ height: lg ? 15 : 13, width: (lg ? 15 : 13) * (969 / 275) }}
            resizeMode="contain"
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  name: { fontFamily: F.heading, fontSize: 22, lineHeight: 28, color: C.tinta, letterSpacing: -0.3 },
  por: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 1 },
  porText: { fontFamily: F.body, fontSize: 12, color: C.gris },
});
