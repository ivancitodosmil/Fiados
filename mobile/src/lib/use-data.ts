import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';

import { errorMessage } from './supabase';

/**
 * Carga datos al enfocar la pantalla (así se actualizan al volver de un formulario)
 * y expone `refresh` para pull-to-refresh.
 */
export function useData<T>(loader: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  const run = useCallback(async (mode: 'focus' | 'pull') => {
    if (mode === 'pull') setRefreshing(true);
    try {
      const d = await loaderRef.current();
      setData(d);
      setError(null);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useFocusEffect(
    useCallback(() => {
      run('focus');
    }, [run]),
  );

  const refresh = useCallback(() => run('pull'), [run]);
  const reload = useCallback(() => run('focus'), [run]);

  return { data, error, loading, refreshing, refresh, reload, setData };
}

/** Lanza el error de una respuesta de Supabase para que lo capture useData / try-catch. */
export function must<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw res.error;
  return res.data as T;
}
