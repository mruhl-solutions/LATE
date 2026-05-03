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
import { Link, useRouter } from 'expo-router';
import { useAuth } from '@/lib/hooks/useAuth';
import { AppButton } from '@/components/ui/AppButton';
import { C } from '@/constants/colors';

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
    } catch (e: unknown) {
      Alert.alert('Error al registrarse', e instanceof Error ? e.message : 'Intentá de nuevo.');
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
          <Text style={styles.subtitle}>Crear cuenta</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Alias (ej: figuritas_ba)"
            placeholderTextColor={C.textMuted}
            autoCapitalize="none"
            value={alias}
            onChangeText={setAlias}
            maxLength={24}
          />
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
            placeholder="Contraseña (mín. 6 caracteres)"
            placeholderTextColor={C.textMuted}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <AppButton title="Crear cuenta" onPress={handleRegistro} loading={loading} />

          <Link href="/(auth)/login" style={styles.link}>
            <Text style={styles.linkText}>¿Ya tenés cuenta? Ingresá</Text>
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
    marginBottom: 36,
  },
  logoImg: {
    width: 100,
    height: 100,
    marginBottom: 14,
  },
  appName: {
    fontSize: 48,
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
