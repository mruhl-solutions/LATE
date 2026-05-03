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
  Pressable,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/lib/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { AppButton } from '@/components/ui/AppButton';
import { C } from '@/constants/colors';

export default function RegistroScreen() {
  const { signUp } = useAuth();
  const router = useRouter();
  const [alias, setAlias] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [codigoGrupo, setCodigoGrupo] = useState('');
  const [showGrupoField, setShowGrupoField] = useState(false);
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

      const codigoNorm = codigoGrupo.trim().toLowerCase();

      if (!needsEmailConfirmation && codigoNorm) {
        // Tenemos sesión activa: intentar unirse al grupo
        const { data: grupo, error: gErr } = await supabase
          .from('grupos')
          .select('id')
          .eq('codigo', codigoNorm)
          .single();

        if (!gErr && grupo) {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await supabase.from('grupo_miembros').insert({
              grupo_id: grupo.id,
              usuario_id: user.id,
            });
          }
        }
      }

      if (needsEmailConfirmation) {
        Alert.alert(
          'Revisá tu email',
          `Te enviamos un link de confirmación. Una vez confirmado, ingresá con tu email y contraseña.${codigoNorm ? '\n\nPodés unirte al grupo desde la pestaña Radar después de confirmar tu cuenta.' : ''}`,
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

          {/* Código de grupo opcional */}
          {!showGrupoField ? (
            <Pressable style={styles.grupoToggle} onPress={() => setShowGrupoField(true)}>
              <Ionicons name="people-outline" size={16} color={C.primary} />
              <Text style={styles.grupoToggleText}>¿Tenés un código de grupo?</Text>
            </Pressable>
          ) : (
            <View style={styles.grupoInputWrap}>
              <View style={styles.grupoInputHeader}>
                <Ionicons name="people-outline" size={16} color={C.primary} />
                <Text style={styles.grupoInputLabel}>Código de grupo (opcional)</Text>
                <Pressable onPress={() => { setShowGrupoField(false); setCodigoGrupo(''); }}>
                  <Ionicons name="close-circle-outline" size={18} color={C.textMuted} />
                </Pressable>
              </View>
              <TextInput
                style={styles.input}
                placeholder="Ej: a3f92c"
                placeholderTextColor={C.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                value={codigoGrupo}
                onChangeText={setCodigoGrupo}
                maxLength={12}
              />
              <Text style={styles.grupoHint}>
                Vas a ser parte del grupo apenas te registres.
              </Text>
            </View>
          )}

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
  grupoToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 4,
    marginBottom: 4,
  },
  grupoToggleText: {
    color: C.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  grupoInputWrap: { gap: 4, marginBottom: 4 },
  grupoInputHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  grupoInputLabel: {
    flex: 1,
    color: C.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  grupoHint: {
    fontSize: 12,
    color: C.textMuted,
    paddingHorizontal: 4,
    marginBottom: 10,
  },
  link: { marginTop: 20, alignSelf: 'center' },
  linkText: { color: C.primary, fontSize: 15 },
});
