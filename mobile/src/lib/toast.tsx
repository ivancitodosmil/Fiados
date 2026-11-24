import Ionicons from '@expo/vector-icons/Ionicons';
import { createContext, use, useCallback, useRef, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp, ReduceMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { haptic } from './haptics';
import { errorMessage } from './supabase';
import { C, F } from './theme';

type Kind = 'ok' | 'error' | 'info';
type Toast = { id: number; kind: Kind; text: string };

type Ctx = {
  show: (text: string, kind?: Kind) => void;
  error: (e: unknown) => void;
};

const ToastContext = createContext<Ctx | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<Toast | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seq = useRef(0);

  const show = useCallback((text: string, kind: Kind = 'ok') => {
    if (timer.current) clearTimeout(timer.current);
    seq.current += 1;
    setToast({ id: seq.current, kind, text });
    haptic(kind === 'error' ? 'error' : 'success');
    timer.current = setTimeout(() => setToast(null), kind === 'error' ? 5000 : 2600);
  }, []);

  const error = useCallback((e: unknown) => show(errorMessage(e), 'error'), [show]);

  const icon = toast?.kind === 'error' ? 'alert-circle' : toast?.kind === 'info' ? 'information-circle' : 'checkmark-circle';
  const tint = toast?.kind === 'error' ? C.bad : toast?.kind === 'info' ? C.verdeClaro : '#7FD8B0';

  return (
    <ToastContext value={{ show, error }}>
      {children}
      <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, { paddingTop: insets.top + 8 }]}>
        {toast && (
          <Animated.View
            key={toast.id}
            entering={FadeInUp.duration(220).reduceMotion(ReduceMotion.System)}
            exiting={FadeOutUp.duration(160).reduceMotion(ReduceMotion.System)}
            style={styles.wrap}>
            <Pressable
              accessibilityRole="alert"
              onPress={() => setToast(null)}
              style={styles.toast}>
              <Ionicons name={icon} size={22} color={tint} />
              <Text style={styles.text}>{toast.text}</Text>
            </Pressable>
          </Animated.View>
        )}
      </View>
    </ToastContext>
  );
}

export function useToast() {
  const ctx = use(ToastContext);
  if (!ctx) throw new Error('useToast fuera de ToastProvider');
  return ctx;
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingHorizontal: 16 },
  toast: {
    maxWidth: 480,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: C.tinta,
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 16,
    boxShadow: '0px 10px 30px -10px rgba(24,40,42,0.45)',
  },
  text: { flex: 1, color: '#fff', fontFamily: F.medium, fontSize: 15, lineHeight: 20 },
});
