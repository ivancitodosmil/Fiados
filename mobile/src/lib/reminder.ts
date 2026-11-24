import { useState } from 'react';
import { Alert, Linking, Platform } from 'react-native';

import { waNumber } from './format';
import { useSession } from './session';
import { PORTAL_URL, supabase } from './supabase';
import { useToast } from './toast';

type Recordatorio = { mensaje: string; celular: string; email: string | null; semaforo: string; total: number };

/**
 * Arma el mensaje con generar_recordatorio, abre WhatsApp (wa.me/593…)
 * y registra el envío en `recordatorios`.
 */
export function useReminder() {
  const { negocio } = useSession();
  const toast = useToast();
  const [sendingId, setSendingId] = useState<string | null>(null);

  async function send(clienteId: string) {
    if (!negocio || sendingId) return;
    setSendingId(clienteId);
    try {
      const { data, error } = await supabase.rpc('generar_recordatorio', {
        p_cliente: clienteId,
        p_url_base: PORTAL_URL || null,
      });
      if (error) throw error;
      const r = data as Recordatorio;
      const numero = waNumber(r.celular);
      if (!numero) {
        const msg = 'Este cliente no tiene celular registrado. Agrégalo en Editar para enviarle recordatorios.';
        if (Platform.OS === 'web') toast.show(msg, 'info');
        else Alert.alert('Falta el celular', msg);
        return;
      }
      const url = `https://wa.me/${numero}?text=${encodeURIComponent(r.mensaje)}`;
      await Linking.openURL(url);
      const ins = await supabase.from('recordatorios').insert({
        negocio_id: negocio.id,
        cliente_id: clienteId,
        canal: 'whatsapp',
        mensaje: r.mensaje,
      });
      if (ins.error) throw ins.error;
      toast.show('Recordatorio registrado');
    } catch (e) {
      toast.error(e);
    } finally {
      setSendingId(null);
    }
  }

  return { send, sendingId };
}
