import { useState } from 'react';
import { Modal, View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C } from '@/constants/colors';

interface CalificacionModalProps {
  visible: boolean;
  alias: string;
  onCalificar: (estrellas: number) => Promise<void>;
  onOmitir: () => void;
}

export function CalificacionModal({ visible, alias, onCalificar, onOmitir }: CalificacionModalProps) {
  const [estrellas, setEstrellas] = useState(0);
  const [saving, setSaving] = useState(false);

  const handleEnviar = async () => {
    if (estrellas === 0 || saving) return;
    setSaving(true);
    try {
      await onCalificar(estrellas);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.emoji}>🎉</Text>
          <Text style={styles.title}>¡Intercambio completado!</Text>
          <Text style={styles.subtitle}>¿Cómo fue el trato con @{alias}?</Text>

          <View style={styles.stars}>
            {[1, 2, 3, 4, 5].map((s) => (
              <Pressable key={s} onPress={() => setEstrellas(s)} hitSlop={10}>
                <Ionicons
                  name={s <= estrellas ? 'star' : 'star-outline'}
                  size={44}
                  color={s <= estrellas ? C.primary : C.border}
                />
              </Pressable>
            ))}
          </View>

          <Pressable
            style={[styles.btnEnviar, estrellas === 0 && styles.btnDisabled]}
            onPress={handleEnviar}
            disabled={estrellas === 0 || saving}
          >
            {saving ? (
              <ActivityIndicator color={C.bg} size="small" />
            ) : (
              <Text style={styles.btnText}>Enviar calificación</Text>
            )}
          </Pressable>

          <Pressable onPress={onOmitir} style={styles.skip}>
            <Text style={styles.skipText}>Omitir</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: C.surface,
    borderRadius: 20,
    padding: 28,
    width: '100%',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  emoji: { fontSize: 40 },
  title: { fontSize: 20, fontWeight: '800', color: C.textPrimary, textAlign: 'center' },
  subtitle: { fontSize: 14, color: C.textSecondary, textAlign: 'center' },
  stars: { flexDirection: 'row', gap: 8, marginVertical: 8 },
  btnEnviar: {
    width: '100%',
    backgroundColor: C.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: C.bg, fontWeight: '800', fontSize: 16 },
  skip: { paddingVertical: 8 },
  skipText: { color: C.textMuted, fontSize: 14 },
});
