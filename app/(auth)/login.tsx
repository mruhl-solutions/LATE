import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  Alert,
} from 'react-native';
import { Link } from 'expo-router';
import { useAuth } from '@/lib/hooks/useAuth';
import { AppButton } from '@/components/ui/AppButton';
import { C } from '@/constants/colors';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Completá todos los campos.');
      return;
    }
    setLoading(true);
    try {
      await signIn(email.trim(), password);
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo iniciar sesión.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.kav}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo */}
        <View style={styles.logoWrap}>
          <Image
            source={require('@/assets/images/logo.png')}
            style={styles.logoImg}
            resizeMode="contain"
          />
          <Text style={styles.appName}>
            <Text style={styles.nameLA}>LA</Text>
            <Text style={styles.nameTE}>TE</Text>
          </Text>
          <Text style={styles.subtitle}>Intercambio de figuritas</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={C.textMuted}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            style={styles.input}
            placeholder="Contraseña"
            placeholderTextColor={C.textMuted}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <AppButton title="Ingresar" onPress={handleLogin} loading={loading} />

          <Link href="/(auth)/registro" style={styles.link}>
            <Text style={styles.linkText}>¿No tenés cuenta? Registrate</Text>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  kav: { flex: 1, backgroundColor: C.bg },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 28,
    paddingBottom: 48,
  },
  logoWrap: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoImg: {
    width: 110,
    height: 110,
    marginBottom: 16,
  },
  appName: {
    fontSize: 52,
    fontWeight: '900',
    letterSpacing: 6,
  },
  nameLA: { color: C.primary },
  nameTE: { color: C.accent },
  subtitle: {
    fontSize: 14,
    color: C.textMuted,
    marginTop: 4,
    letterSpacing: 0.5,
  },
  form: { gap: 4 },
  input: {
    backgroundColor: C.surface,
    color: C.textPrimary,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    fontSize: 16,
    borderWidth: 1,
    borderColor: C.border,
  },
  link: { marginTop: 20, alignSelf: 'center' },
  linkText: { color: C.primary, fontSize: 15 },
});
