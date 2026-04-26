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
import { Link } from 'expo-router';
import { useAuth } from '@/lib/hooks/useAuth';
import { AppButton } from '@/components/ui/AppButton';

export default function RegistroScreen() {
  const { signUp } = useAuth();
  const [alias, setAlias] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegistro = async () => {
    if (!alias || !email || !password) {
      Alert.alert('Error', 'Completá todos los campos.');
      return;
    }
    if (alias.length < 3) {
      Alert.alert('Error', 'El alias debe tener al menos 3 caracteres.');
      return;
    }
    setLoading(true);
    try {
      await signUp(email.trim(), password, alias.trim());
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo registrar.');
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
          placeholderTextColor="#999"
          autoCapitalize="none"
          value={alias}
          onChangeText={setAlias}
          maxLength={24}
        />
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#999"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="Contraseña (mín. 6 caracteres)"
          placeholderTextColor="#999"
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
  container: { flex: 1, backgroundColor: '#0F0F0F' },
  inner: { flex: 1, justifyContent: 'center', padding: 24 },
  logo: {
    fontSize: 56,
    fontWeight: '900',
    color: '#FF6B35',
    textAlign: 'center',
    letterSpacing: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#999',
    textAlign: 'center',
    marginBottom: 40,
    marginTop: 4,
  },
  input: {
    backgroundColor: '#1C1C1E',
    color: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#2C2C2E',
  },
  link: { marginTop: 20, alignSelf: 'center' },
  linkText: { color: '#FF6B35', fontSize: 15 },
});
