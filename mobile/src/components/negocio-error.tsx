import { useState } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSession } from '@/lib/session';
import { C } from '@/lib/theme';

import { Button, Empty } from './ui';

/** Hay sesión pero no se pudo cargar el negocio (sin conexión o sin membresía). */
export function NegocioError() {
  const { negocioError, reloadNegocio, signOut } = useSession();
  const [busy, setBusy] = useState(false);
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.blanco, justifyContent: 'center' }}>
      <Empty
        icon="storefront-outline"
        title="No pudimos cargar tu negocio"
        text={negocioError ?? 'Revisa tu conexión e inténtalo de nuevo.'}
        action={
          <View style={{ gap: 10, width: '100%', maxWidth: 320 }}>
            <Button
              title="Reintentar"
              loading={busy}
              onPress={async () => {
                setBusy(true);
                await reloadNegocio();
                setBusy(false);
              }}
            />
            <Button title="Cerrar sesión" variant="secondary" onPress={signOut} />
          </View>
        }
      />
    </SafeAreaView>
  );
}
