import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useAuth } from '@/lib/hooks/useAuth';
import { AppButton } from '@/components/ui/AppButton';

export default function RegistroScreen() {
  const { signUp } = useAuth();
  const router = useRouter();
  const [alias, setAlias] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegistro = async () => {
    if (!alias || !email || !password) {
      Alert.alert('Error', 'Completá todos los campos.');
      return;
    }
    if (alias.trim().length < 3) {
      Alert.alert('Error', 'El alias debe tener al menos 3 caracteres.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Error', 'La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    setLoading(true);
    try {
      const { needsEmailConfirmation } = await signUp(email.trim(), password, alias.trim());
      if (needsEmailConfirmation) {
        Alert.alert(
          'Revisá tu email',
          'Te enviamos un link de confirmación. Una vez confirmado, ingresá con tu email y contraseña.',
          [{ text: 'Entendido', onPress: () => router.replace('/(auth)/login') }],
        );
      }
      // Si no hay confirmación, onAuthStateChange dispara la redirección automática
    } catch (e: unknown) {
      Alert.alert('Error al registrarse', e instanceof Error ? e.message : 'Intentá de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.inner}>
        <Text style={styles.logo}>LATE</Text>
        <Text style={styles.subtitle}>Crear cuenta</Text>

        <TextInput
          style={styles.input}
          placeholder="Alias (ej: figuritas_ba)"
          placeholderTextColor="#6B7280"
          autoCapitalize="none"
          value={alias}
          onChangeText={setAlias}
          maxLength={24}
        />
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#6B7280"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="Contraseña (mín. 6 caracteres)"
          placeholderTextColor="#6B7280"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <AppButton title="Crear cuenta" onPress={handleRegistro} loading={loading} />

        <Link href="/(auth)/login" style={styles.link}>
          <Text style={styles.linkText}>¿Ya tenés cuenta? Ingresá</Text>
        </Link>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  inner: { flex: 1, justifyContent: 'center', padding: 24 },
  logo: {
    fontSize: 56,
    fontWeight: '900',
    color: '#7C3AED',
    textAlign: 'center',
    letterSpacing: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 40,
    marginTop: 4,
  },
  input: {
    backgroundColor: '#1F2937',
    color: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#374151',
  },
  link: { marginTop: 20, alignSelf: 'center' },
  linkText: { color: '#7C3AED', fontSize: 15 },
});
