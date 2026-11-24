import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, RefreshControl, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { C } from '@/lib/theme';

export const MAX_W = 560;

/**
 * Contenedor de pantalla: fondo blanco, área segura, scroll con teclado
 * y pull-to-refresh opcional. `footer` queda fijo abajo (botón principal).
 */
export function Screen({
  children,
  header,
  footer,
  scroll = true,
  refreshing,
  onRefresh,
  edges = ['top'],
  contentStyle,
}: {
  children: ReactNode;
  header?: ReactNode;
  footer?: ReactNode;
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  edges?: Edge[];
  contentStyle?: StyleProp<ViewStyle>;
}) {
  return (
    <SafeAreaView style={styles.safe} edges={edges}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {header ? <View style={styles.center}>{header}</View> : null}
        {scroll ? (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={[styles.content, contentStyle]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            refreshControl={
              onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={C.verde} colors={[C.verde]} /> : undefined
            }>
            {children}
          </ScrollView>
        ) : (
          <View style={[{ flex: 1 }, styles.center]}>{children}</View>
        )}
        {footer ? (
          <SafeAreaView edges={['bottom']} style={styles.footer}>
            <View style={styles.center}>{footer}</View>
          </SafeAreaView>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.blanco },
  center: { width: '100%', maxWidth: MAX_W, alignSelf: 'center' },
  content: { paddingHorizontal: 20, paddingBottom: 40, width: '100%', maxWidth: MAX_W, alignSelf: 'center' },
  footer: { backgroundColor: C.blanco, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 10 },
});
