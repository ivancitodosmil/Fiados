import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Platform, Share, StyleSheet, Switch, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { Screen } from '@/components/screen';
import { Between, Button, Card, ErrorBox, Header, Ionicons, Loading, Row, T } from '@/components/ui';
import { confirm } from '@/lib/confirm';
import { firstName } from '@/lib/format';
import { portalLink, supabase } from '@/lib/supabase';
import { C, F } from '@/lib/theme';
import { useToast } from '@/lib/toast';
import type { Cliente } from '@/lib/types';
import { must, useData } from '@/lib/use-data';

export default function QrScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const { data, error, loading, reload, setData } = useData(async () => {
    return must(await supabase.from('clientes').select('id,nombres,portal_token,portal_activo').eq('id', id).single()) as Pick<
      Cliente,
      'id' | 'nombres' | 'portal_token' | 'portal_activo'
    >;
  }, [id]);

  const link = data ? portalLink(data.portal_token) : '';

  async function share() {
    if (!data || !link) return;
    const message = `Hola ${firstName(data.nombres)}, aquí puedes ver el detalle de tu cuenta: ${link}`;
    try {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && !navigator.share) {
        await navigator.clipboard?.writeText(link);
        toast.show('Enlace copiado');
        return;
      }
      await Share.share(Platform.OS === 'ios' ? { message, url: link } : { message });
    } catch (e) {
      toast.error(e);
    }
  }

  async function regenerar() {
    if (!data) return;
    const ok = await confirm(
      '¿Generar un QR nuevo?',
      'El código y el enlace anteriores dejarán de funcionar. Útil si el cliente perdió su enlace o lo compartió por error.',
      'Generar nuevo',
      true,
    );
    if (!ok) return;
    setBusy(true);
    const { data: token, error: e } = await supabase.rpc('regenerar_qr', { p_cliente: data.id });
    setBusy(false);
    if (e) return toast.error(e);
    setData({ ...data, portal_token: token as string });
    toast.show('Nuevo QR generado');
  }

  async function togglePortal(v: boolean) {
    if (!data) return;
    setData({ ...data, portal_activo: v });
    const { error: e } = await supabase.from('clientes').update({ portal_activo: v }).eq('id', data.id);
    if (e) {
      setData({ ...data, portal_activo: !v });
      toast.error(e);
    }
  }

  return (
    <Screen header={<Header title="Código QR" left="back" />}>
      {loading ? (
        <Loading />
      ) : !data ? (
        <ErrorBox message={error ?? 'Cliente no encontrado'} onRetry={reload} />
      ) : (
        <View style={{ alignItems: 'center', paddingTop: 8 }}>
          <T variant="muted" style={{ textAlign: 'center', fontSize: 16, lineHeight: 22, maxWidth: 320 }}>
            {data.nombres} puede escanear este código para ver lo que debe, sin instalar nada.
          </T>

          <Card style={styles.qrCard}>
            {link && data.portal_activo ? (
              <QRCode value={link} size={232} color={C.tinta} backgroundColor="#fff" ecl="M" />
            ) : (
              <View style={styles.qrOff}>
                <Ionicons name={link ? 'eye-off-outline' : 'link-outline'} size={36} color={C.grisSuave} />
                <T variant="muted" style={{ textAlign: 'center', marginTop: 10 }}>
                  {link ? 'El portal está desactivado para este cliente.' : 'Falta configurar EXPO_PUBLIC_PORTAL_URL para generar el enlace.'}
                </T>
              </View>
            )}
          </Card>

          {link ? (
            <T variant="small" selectable style={{ textAlign: 'center', marginTop: 14, maxWidth: 320 }} numberOfLines={2}>
              {link}
            </T>
          ) : null}

          <View style={{ width: '100%', gap: 10, marginTop: 22 }}>
            <Button title="Compartir enlace" icon="share-outline" onPress={share} disabled={!link || !data.portal_activo} />
            <Button title="Generar QR nuevo" icon="refresh" variant="secondary" onPress={regenerar} loading={busy} />
          </View>

          <Card style={{ width: '100%', marginTop: 22 }}>
            <Between>
              <Row style={{ flex: 1, gap: 10 }}>
                <Ionicons name="globe-outline" size={22} color={C.verde} />
                <View style={{ flex: 1 }}>
                  <T style={{ fontFamily: F.semibold }}>Portal activo</T>
                  <T variant="small">Si lo apagas, el enlace deja de mostrar la cuenta.</T>
                </View>
              </Row>
              <Switch
                value={data.portal_activo}
                onValueChange={togglePortal}
                trackColor={{ true: C.verde, false: C.borde }}
                thumbColor="#fff"
                accessibilityLabel="Portal activo"
              />
            </Between>
          </Card>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  qrCard: { marginTop: 22, padding: 24, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  qrOff: { width: 232, height: 232, alignItems: 'center', justifyContent: 'center', padding: 16 },
});
