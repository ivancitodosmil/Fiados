import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import type { ComponentProps, ComponentRef, ReactNode, Ref } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type PressableProps,
  type StyleProp,
  type TextInputProps,
  type TextProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';

import { initials, moneyParts } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { C, ESTADO, F, R, shadowCard, tabular, type Estado } from '@/lib/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

// ------------------------------------------------------------------ texto

type TVariant = 'body' | 'muted' | 'small' | 'label' | 'title' | 'h1' | 'h2' | 'section' | 'num';

export function T({ variant = 'body', style, ...props }: TextProps & { variant?: TVariant }) {
  return <Text {...props} style={[styles.t, tStyles[variant], style]} />;
}

const tStyles = StyleSheet.create({
  body: { fontFamily: F.body, fontSize: 16, color: C.tinta },
  muted: { fontFamily: F.body, fontSize: 14, color: C.gris },
  small: { fontFamily: F.body, fontSize: 13, color: C.gris },
  label: { fontFamily: F.medium, fontSize: 13, color: C.gris },
  title: { fontFamily: F.heading, fontSize: 17, color: C.tinta, letterSpacing: -0.17 },
  h1: { fontFamily: F.heading, fontSize: 24, color: C.tinta, letterSpacing: -0.3 },
  h2: { fontFamily: F.heading, fontSize: 20, color: C.tinta, letterSpacing: -0.2 },
  section: {
    fontFamily: F.semibold,
    fontSize: 13,
    color: C.gris,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  num: { fontFamily: F.heading, fontSize: 17, color: C.tinta, letterSpacing: -0.3, ...tabular },
});

/** Monto grande con los centavos más pequeños y en gris. */
export function BigMoney({
  value,
  size = 42,
  color = C.tinta,
  centsColor = C.gris,
  style,
}: {
  value: unknown;
  size?: number;
  color?: string;
  centsColor?: string;
  style?: StyleProp<TextStyle>;
}) {
  const [int, cents] = moneyParts(value);
  return (
    <Text
      style={[styles.t, { fontFamily: F.heading, fontSize: size, color, letterSpacing: -size * 0.02, ...tabular }, style]}
      numberOfLines={1}
      adjustsFontSizeToFit>
      {int}
      <Text style={{ fontSize: Math.round(size * 0.62), color: centsColor }}>{cents}</Text>
    </Text>
  );
}

// ------------------------------------------------------------------ press feedback

/** Pressable con una leve escala al presionar (respeta "reducir movimiento"). */
export function Press({
  style,
  children,
  scaleTo = 0.97,
  hapticKind,
  onPress,
  disabled,
  ...props
}: Omit<PressableProps, 'style' | 'children'> & {
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
  scaleTo?: number;
  hapticKind?: 'light' | 'select';
}) {
  const reduce = useReducedMotion();
  const s = useSharedValue(1);
  const o = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: s.get() }], opacity: o.get() }));
  return (
    <AnimatedPressable
      {...props}
      disabled={disabled}
      onPressIn={(e) => {
        if (reduce) o.set(withTiming(0.7, { duration: 80 }));
        else s.set(withTiming(scaleTo, { duration: 90 }));
        props.onPressIn?.(e);
      }}
      onPressOut={(e) => {
        s.set(withTiming(1, { duration: 160 }));
        o.set(withTiming(1, { duration: 160 }));
        props.onPressOut?.(e);
      }}
      onPress={(e) => {
        if (hapticKind) haptic(hapticKind);
        onPress?.(e);
      }}
      style={[style, anim, disabled && { opacity: 0.5 }]}>
      {children}
    </AnimatedPressable>
  );
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// ------------------------------------------------------------------ botones

type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export function Button({
  title,
  onPress,
  variant = 'primary',
  icon,
  loading,
  disabled,
  style,
  height = 52,
  accessibilityLabel,
}: {
  title: string;
  onPress?: () => void;
  variant?: BtnVariant;
  icon?: IconName | 'whatsapp';
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  height?: number;
  accessibilityLabel?: string;
}) {
  const fg = variant === 'primary' ? '#fff' : variant === 'danger' ? C.bad : variant === 'ghost' ? C.verde : C.tinta;
  return (
    <Press
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: !!(disabled || loading), busy: !!loading }}
      onPress={onPress}
      disabled={disabled || loading}
      hapticKind="light"
      style={[styles.btn, { height }, btnStyles[variant], style]}>
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon && <Ionicons name={icon === 'whatsapp' ? 'logo-whatsapp' : icon} size={20} color={fg} />}
          <Text style={[styles.btnText, { color: fg }]} numberOfLines={1}>
            {title}
          </Text>
        </>
      )}
    </Press>
  );
}

const btnStyles = StyleSheet.create({
  primary: { backgroundColor: C.verde },
  secondary: { backgroundColor: '#fff', borderWidth: 1, borderColor: C.borde },
  ghost: { backgroundColor: 'transparent' },
  danger: { backgroundColor: '#fff', borderWidth: 1, borderColor: C.badBg },
});

export function IconButton({
  icon,
  onPress,
  label,
  color = C.tinta,
  bg = 'transparent',
  size = 48,
}: {
  icon: IconName;
  onPress?: () => void;
  label: string;
  color?: string;
  bg?: string;
  size?: number;
}) {
  return (
    <Press
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={6}
      style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name={icon} size={24} color={color} />
    </Press>
  );
}

/** Botón rápido de WhatsApp: cuadrado redondeado de 40px (zona táctil de 48). */
export function WhatsAppButton({ onPress, loading, label }: { onPress: () => void; loading?: boolean; label: string }) {
  return (
    <Press
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      disabled={loading}
      hitSlop={6}
      hapticKind="light"
      style={styles.wa}>
      {loading ? <ActivityIndicator color={C.ok} size="small" /> : <Ionicons name="logo-whatsapp" size={21} color={C.ok} />}
    </Press>
  );
}

// ------------------------------------------------------------------ superficies

export function Card({ style, children }: { style?: StyleProp<ViewStyle>; children?: ReactNode }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Soft({ style, children }: { style?: StyleProp<ViewStyle>; children?: ReactNode }) {
  return <View style={[styles.soft, style]}>{children}</View>;
}

export function Divider({ inset = 0 }: { inset?: number }) {
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: C.borde, marginLeft: inset }} />;
}

// ------------------------------------------------------------------ piezas

export function Avatar({ name, size = 44 }: { name: string; size?: number }) {
  return (
    <View
      style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: C.tinta, alignItems: 'center', justifyContent: 'center' }}
      accessibilityElementsHidden
      importantForAccessibility="no">
      <Text style={{ fontFamily: F.heading, color: '#fff', fontSize: Math.round(size * 0.34) }}>{initials(name)}</Text>
    </View>
  );
}

/** Etiqueta de estado sólida (semáforo v2): radio 6, mayúsculas, sin punto. */
export function StatusTag({ estado, label, style }: { estado: Estado; label: string; style?: StyleProp<ViewStyle> }) {
  const s = ESTADO[estado];
  return (
    <View
      style={[styles.tag, { backgroundColor: s.bg }, s.border ? { borderWidth: 1, borderColor: s.border } : null, style]}
      accessibilityLabel={`Estado: ${label}`}>
      <Text style={[styles.tagText, { color: s.fg }]} numberOfLines={1}>
        {label.toUpperCase()}
      </Text>
    </View>
  );
}

export function Chip({
  label,
  selected,
  onPress,
  dot,
  small,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  dot?: string | null;
  small?: boolean;
}) {
  const content = (
    <>
      {dot ? <View style={[styles.swatch, { backgroundColor: dot }]} /> : null}
      <Text style={[styles.chipText, small && { fontSize: 13 }, selected && { color: '#fff' }, tabular]} numberOfLines={1}>
        {label}
      </Text>
    </>
  );
  if (!onPress)
    return <View style={[styles.chip, small && styles.chipSmall, selected && styles.chipOn]}>{content}</View>;
  return (
    <Press
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      onPress={onPress}
      hapticKind="select"
      style={[styles.chip, styles.chipTap, selected && styles.chipOn]}>
      {content}
    </Press>
  );
}

export function Segmented<V extends string>({
  options,
  value,
  onChange,
  compact,
}: {
  options: readonly { value: V; label: string }[];
  value: V;
  onChange: (v: V) => void;
  compact?: boolean;
}) {
  return (
    <View style={styles.seg} accessibilityRole="tablist">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onPress={() => {
              if (!on) haptic('select');
              onChange(o.value);
            }}
            style={[styles.segItem, compact && styles.segCompact, on && styles.segOn]}>
            <Text style={[styles.segText, compact && { fontSize: 13 }, on && { color: C.tinta, fontFamily: F.semibold }]} numberOfLines={1}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ------------------------------------------------------------------ formularios

export function Field({
  label,
  error,
  hint,
  style,
  inputStyle,
  right,
  ref,
  ...props
}: TextInputProps & {
  ref?: Ref<ComponentRef<typeof TextInput>>;
  label: string;
  error?: string | null;
  hint?: string;
  inputStyle?: StyleProp<TextStyle>;
  right?: ReactNode;
}) {
  return (
    <View style={style}>
      <View style={[styles.field, !!error && { borderColor: C.bad }]}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TextInput
            ref={ref}
            placeholderTextColor={C.grisSuave}
            accessibilityLabel={label}
            {...props}
            style={[styles.input, props.multiline && { minHeight: 72, textAlignVertical: 'top' }, inputStyle]}
          />
          {right}
        </View>
      </View>
      {error ? (
        <Text style={styles.fieldError} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : hint ? (
        <Text style={styles.fieldHint}>{hint}</Text>
      ) : null}
    </View>
  );
}

// ------------------------------------------------------------------ estructura

export function Header({
  title,
  left = 'back',
  right,
  onLeft,
}: {
  title?: string;
  left?: 'back' | 'cancel' | 'none';
  right?: ReactNode;
  onLeft?: () => void;
}) {
  const goBack = onLeft ?? (() => (router.canGoBack() ? router.back() : router.replace('/')));
  return (
    <View style={styles.header}>
      <View style={styles.headerSide}>
        {left === 'back' && <IconButton icon="arrow-back" label="Volver" onPress={goBack} />}
        {left === 'cancel' && (
          <Pressable accessibilityRole="button" onPress={goBack} hitSlop={10} style={styles.headerTextBtn}>
            <Text style={{ fontFamily: F.body, fontSize: 16, color: C.gris }}>Cancelar</Text>
          </Pressable>
        )}
      </View>
      <Text style={[tStyles.title, { flex: 1, textAlign: 'center' }]} numberOfLines={1} accessibilityRole="header">
        {title}
      </Text>
      <View style={[styles.headerSide, { alignItems: 'flex-end' }]}>{right}</View>
    </View>
  );
}

export function HeaderLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} hitSlop={10} style={styles.headerTextBtn}>
      <Text style={{ fontFamily: F.semibold, fontSize: 16, color: C.verde }}>{label}</Text>
    </Pressable>
  );
}

export function SectionTitle({ children, right, style }: { children: ReactNode; right?: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 24, marginBottom: 10, paddingHorizontal: 2 }, style]}>
      <T variant="section" accessibilityRole="header" style={{ flex: 1 }}>
        {children}
      </T>
      {right}
    </View>
  );
}

export function Empty({ icon, title, text, action }: { icon: IconName; title: string; text?: string; action?: ReactNode }) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Ionicons name={icon} size={28} color={C.verde} />
      </View>
      <T variant="title" style={{ textAlign: 'center' }}>
        {title}
      </T>
      {text ? (
        <T variant="muted" style={{ textAlign: 'center', marginTop: 6, maxWidth: 300 }}>
          {text}
        </T>
      ) : null}
      {action ? <View style={{ marginTop: 18, alignSelf: 'stretch', alignItems: 'center' }}>{action}</View> : null}
    </View>
  );
}

export function Loading() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 }}>
      <ActivityIndicator color={C.verde} size="large" />
    </View>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Empty
      icon="cloud-offline-outline"
      title="No se pudo cargar"
      text={message}
      action={onRetry ? <Button title="Reintentar" variant="secondary" onPress={onRetry} style={{ paddingHorizontal: 28 }} /> : null}
    />
  );
}

export function Row({ style, children }: { style?: StyleProp<ViewStyle>; children?: ReactNode }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 12 }, style]}>{children}</View>;
}

export function Between({ style, children }: { style?: StyleProp<ViewStyle>; children?: ReactNode }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }, style]}>{children}</View>;
}

export { Ionicons };

const styles = StyleSheet.create({
  t: { includeFontPadding: false } as TextStyle,
  btn: {
    borderRadius: R.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 18,
  },
  btnText: { fontFamily: F.semibold, fontSize: 16 },
  wa: { width: 40, height: 40, borderRadius: 12, backgroundColor: C.waBg, alignItems: 'center', justifyContent: 'center' },
  card: { backgroundColor: '#fff', borderRadius: R.card, padding: 16, ...shadowCard },
  soft: { backgroundColor: C.soft, borderRadius: R.card, padding: 20 },
  tag: {
    alignSelf: 'flex-start',
    justifyContent: 'center',
    height: 22,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  tagText: { fontFamily: F.semibold, fontSize: 11, letterSpacing: 0.44 },
  swatch: { width: 10, height: 10, borderRadius: 3 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: R.pill,
    borderWidth: 1,
    borderColor: C.borde,
    backgroundColor: '#fff',
    alignSelf: 'flex-start',
  },
  chipSmall: { paddingHorizontal: 10, paddingVertical: 5 },
  chipTap: { minHeight: 44, paddingHorizontal: 16 },
  chipOn: { backgroundColor: C.tinta, borderColor: C.tinta },
  chipText: { fontFamily: F.medium, fontSize: 15, color: C.tinta },
  seg: { flexDirection: 'row', backgroundColor: C.track, borderRadius: 16, padding: 4, gap: 4 },
  segItem: { flex: 1, minHeight: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  segCompact: { flexGrow: 1, flexShrink: 1, flexBasis: 'auto', paddingHorizontal: 8 },
  segOn: { backgroundColor: '#fff', boxShadow: '0px 1px 3px rgba(0,0,0,0.08)' },
  segText: { fontFamily: F.medium, fontSize: 14, color: C.gris },
  field: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: C.borde,
    borderRadius: R.field,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
    minHeight: 60,
  },
  fieldLabel: { fontFamily: F.body, fontSize: 12, color: C.gris },
  input: {
    flex: 1,
    fontFamily: F.medium,
    fontSize: 17,
    color: C.tinta,
    paddingVertical: 6,
    paddingHorizontal: 0,
    minHeight: 34,
    outlineStyle: 'none',
  } as unknown as TextStyle,
  fieldError: { color: C.bad, fontFamily: F.medium, fontSize: 13, marginTop: 6, marginLeft: 4 },
  fieldHint: { color: C.gris, fontFamily: F.body, fontSize: 13, marginTop: 6, marginLeft: 4 },
  header: { flexDirection: 'row', alignItems: 'center', minHeight: 56, paddingHorizontal: 8, gap: 4 },
  headerSide: { minWidth: 88 },
  headerTextBtn: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 12 },
  empty: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 24 },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: C.soft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
});
