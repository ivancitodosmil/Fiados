import { useLocalSearchParams } from 'expo-router';

import { ClienteForm } from '@/components/cliente-form';
import { Screen } from '@/components/screen';
import { ErrorBox, Header, Loading } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import type { Cliente } from '@/lib/types';
import { must, useData } from '@/lib/use-data';

export default function EditarCliente() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, error, loading, reload } = useData(async () => {
    return must(await supabase.from('clientes').select('*').eq('id', id).single()) as Cliente;
  }, [id]);

  if (data) return <ClienteForm key={data.id} initial={data} />;
  return (
    <Screen header={<Header title="Editar cliente" left="cancel" />}>
      {loading ? <Loading /> : <ErrorBox message={error ?? 'Cliente no encontrado'} onRetry={reload} />}
    </Screen>
  );
}
