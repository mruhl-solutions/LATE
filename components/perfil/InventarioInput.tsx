import { useState, useMemo } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { cleanInventoryString } from '@/lib/parsers';
import { C } from '@/constants/colors';

interface InventarioInputProps {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  onChangeText: (v: string) => void;
  accentColor?: string;
  savedCount?: number;
}

export function InventarioInput({
  label,
  icon,
  value,
  onChangeText,
  accentColor = C.primary,
  savedCount = 0,
}: InventarioInputProps) {
  const [focused, setFocused] = useState(false);
  const parsedCount = useMemo(() => cleanInventoryString(value).length, [value]);
  const isDirty = parsedCount !== savedCount;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={[styles.iconWrap, { backgroundColor: `${accentColor}22` }]}>
          <Ionicons name={icon} size={15} color={accentColor} />
        </View>
        <Text style={styles.label}>{label}</Text>
        <View style={[styles.badge, { backgroundColor: `${accentColor}22` }]}>
          <Text style={[styles.badgeText, { color: accentColor }]}>{parsedCount}</Text>
          {isDirty && <View style={[styles.dirtyDot, { backgroundColor: accentColor }]} />}
        </View>
      </View>

      <TextInput
        style={[
          styles.input,
          { borderColor: focused ? accentColor : `${accentColor}30` },
          focused && { shadowColor: accentColor, shadowOpacity: 0.15, shadowRadius: 6, shadowOffset: { width: 0, height: 0 } },
        ]}
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder="Ej: 12, 45, 102, 300"
        placeholderTextColor={C.textMuted}
        keyboardType="numbers-and-punctuation"
        multiline
        autoCapitalize="none"
        autoCorrect={false}
        textAlignVertical="top"
      />

      <Text style={styles.hint}>
        {parsedCount === 0
          ? 'Separar con comas o espacios'
          : `${parsedCount} figurita${parsedCount !== 1 ? 's' : ''} detectada${parsedCount !== 1 ? 's' : ''}`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  iconWrap: { width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  label: { flex: 1, fontSize: 13, fontWeight: '700', color: C.textSecondary, letterSpacing: 0.3 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  badgeText: { fontSize: 13, fontWeight: '800' },
  dirtyDot: { width: 6, height: 6, borderRadius: 3 },
  input: {
    backgroundColor: C.surfaceDeep,
    color: C.textPrimary,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
    fontSize: 14,
    borderWidth: 1.5,
    minHeight: 72,
    lineHeight: 22,
    fontFamily: 'monospace',
  },
  hint: { marginTop: 5, fontSize: 11, color: C.textMuted, marginLeft: 2 },
});
