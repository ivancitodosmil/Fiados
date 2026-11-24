import { router } from 'expo-router';
import { useRef, useState, type ComponentRef } from 'react';
import { Pressable, StyleSheet, Text, View, TextInput } from 'react-native';

import { errorMessage, supabase } from '@/lib/supabase';
import { C, F } from '@/lib/theme';
import { useToast } from '@/lib/toast';

import { Brand } from './brand';
import { Screen } from './screen';
import { Button, Field, Ionicons, Soft, T } from './ui';

export function AuthForm({ mode }: { mode: 'login' | 'registro' }) {
  const toast = useToast();
  const registro = mode === 'registro';
  const [negocio, setNegocio] = useState('');
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sent, setSent] = useState(false);
  const emailRef = useRef<ComponentRef<typeof TextInput>>(null);
  const passRef = useRef<ComponentRef<typeof TextInput>>(null);

  async function submit() {
    const e: Record<string, string> = {};
    if (registro && !negocio.trim()) e.negocio = 'Escribe el nombre de tu negocio';
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) e.email = 'Escribe un correo válido';
    if (password.length < 6) e.password = 'Mínimo 6 caracteres';
    setErrors(e);
    if (Object.keys(e).length) return;

    setBusy(true);
    try {
      if (registro) {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { negocio: negocio.trim(), ...(nombre.trim() ? { nombre: nombre.trim() } : {}) } },
        });
        if (error) throw error;
        if (!data.session) setSent(true);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
      }
    } catch (err) {
      toast.show(errorMessage(err), 'error');
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <Screen>
        <View style={{ paddingTop: 32 }}>
          <Brand size="lg" />
          <Soft style={{ marginTop: 40, alignItems: 'flex-start', gap: 10 }}>
            <Ionicons name="mail-open-outline" size={30} color={C.verde} />
            <T variant="h2">Revisa tu correo</T>
            <T variant="muted" style={{ fontSize: 16, lineHeight: 23 }}>
              Te enviamos un enlace a {email.trim()} para confirmar tu cuenta. Después vuelve aquí e ingresa.
            </T>
          </Soft>
          <Button title="Ir a ingresar" style={{ marginTop: 20 }} onPress={() => router.replace('/login')} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen
      footer={
        <Pressable
          accessibilityRole="link"
          onPress={() => router.replace(registro ? '/login' : '/registro')}
          style={styles.switch}>
          <Text style={styles.switchText}>
            {registro ? '¿Ya tienes cuenta? ' : '¿No tienes cuenta? '}
            <Text style={{ color: C.verde, fontFamily: F.semibold }}>{registro ? 'Ingresar' : 'Crear cuenta'}</Text>
          </Text>
        </Pressable>
      }>
      <View style={{ paddingTop: 28 }}>
        <Brand size="lg" />
        <T variant="h1" style={{ marginTop: 44, fontSize: 28, lineHeight: 36 }} accessibilityRole="header">
          {registro ? 'Crea tu cuenta' : 'Hola de nuevo'}
        </T>
        <T variant="muted" style={{ marginTop: 6, fontSize: 16, lineHeight: 22 }}>
          {registro
            ? 'Lleva la cuenta de lo que te deben, sin cuaderno.'
            : 'Ingresa para ver quién te debe y cobrar a tiempo.'}
        </T>

        <View style={{ gap: 12, marginTop: 28 }}>
          {registro && (
            <Field
              label="Tu nombre (opcional)"
              placeholder="Don Pepe"
              value={nombre}
              onChangeText={setNombre}
              autoCapitalize="words"
              autoComplete="name"
              returnKeyType="next"
            />
          )}
          {registro && (
            <Field
              label="Nombre del negocio"
              placeholder="Tienda Don Pepe"
              value={negocio}
              onChangeText={setNegocio}
              autoCapitalize="words"
              returnKeyType="next"
              onSubmitEditing={() => emailRef.current?.focus()}
              error={errors.negocio}
            />
          )}
          <Field
            ref={emailRef}
            label="Correo"
            placeholder="tu@correo.com"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            autoComplete="email"
            textContentType="emailAddress"
            returnKeyType="next"
            onSubmitEditing={() => passRef.current?.focus()}
            error={errors.email}
          />
          <Field
            ref={passRef}
            label="Contraseña"
            placeholder={registro ? 'Mínimo 6 caracteres' : 'Tu contraseña'}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!show}
            autoCapitalize="none"
            autoComplete={registro ? 'new-password' : 'current-password'}
            textContentType={registro ? 'newPassword' : 'password'}
            returnKeyType="go"
            onSubmitEditing={submit}
            error={errors.password}
            right={
              <Pressable
                onPress={() => setShow((s) => !s)}
                accessibilityRole="button"
                accessibilityLabel={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                hitSlop={12}
                style={{ padding: 4 }}>
                <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={22} color={C.gris} />
              </Pressable>
            }
          />
        </View>

        <Button title={registro ? 'Crear cuenta' : 'Ingresar'} loading={busy} onPress={submit} style={{ marginTop: 24 }} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  switch: { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  switchText: { fontFamily: F.body, fontSize: 15, color: C.gris },
});
