import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { C, F } from '@/lib/theme';

import { Brand } from './brand';
import { Ionicons, Soft, T } from './ui';

const VARS = [
  ['EXPO_PUBLIC_SUPABASE_URL', 'URL del proyecto (Project Settings → API)'],
  ['EXPO_PUBLIC_SUPABASE_ANON_KEY', 'Clave pública "anon"'],
  ['EXPO_PUBLIC_PORTAL_URL', 'URL de la web, para el QR y los recordatorios'],
] as const;

/** Se muestra cuando faltan las variables de entorno de Supabase. */
export function ConfigScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.blanco }}>
      <ScrollView contentContainerStyle={styles.wrap}>
        <Brand size="lg" />
        <View style={styles.icon}>
          <Ionicons name="construct-outline" size={30} color={C.verde} />
        </View>
        <T variant="h1">Configura Supabase</T>
        <T variant="muted" style={{ marginTop: 8, fontSize: 16, lineHeight: 23 }}>
          La app todavía no sabe a qué base de datos conectarse. Crea un archivo{' '}
          <Text style={styles.code}>.env</Text> en la carpeta <Text style={styles.code}>mobile/</Text> (puedes copiar{' '}
          <Text style={styles.code}>.env.example</Text>) con estas variables y vuelve a iniciar Expo:
        </T>
        <Soft style={{ marginTop: 20, gap: 14 }}>
          {VARS.map(([k, d]) => (
            <View key={k}>
              <Text style={styles.varName} selectable>
                {k}
              </Text>
              <T variant="small">{d}</T>
            </View>
          ))}
        </Soft>
        <T variant="small" style={{ marginTop: 16 }}>
          Después ejecuta: <Text style={styles.code}>npx expo start --clear</Text>
        </T>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 24, paddingTop: 32, maxWidth: 560, width: '100%', alignSelf: 'center' },
  icon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: C.soft,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
    marginBottom: 16,
  },
  code: { fontFamily: F.semibold, color: C.tinta },
  varName: { fontFamily: F.semibold, fontSize: 14, color: C.verde, marginBottom: 2 },
});
