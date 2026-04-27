import { View, Text, TextInput, StyleSheet } from 'react-native';

interface InventarioInputProps {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  count?: number;
  accentColor?: string;
  keyboardType?: 'numbers-and-punctuation' | 'number-pad' | 'default';
}

export function InventarioInput({
  label,
  value,
  onChangeText,
  count,
  accentColor = '#7C3AED',
  keyboardType = 'numbers-and-punctuation',
}: InventarioInputProps) {
  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {count !== undefined && (
          <View style={[styles.countBadge, { backgroundColor: `${accentColor}22` }]}>
            <Text style={[styles.countText, { color: accentColor }]}>{count}</Text>
          </View>
        )}
      </View>
      <TextInput
        style={[styles.input, { borderColor: `${accentColor}55` }]}
        value={value}
        onChangeText={onChangeText}
        placeholder="Ej: 12, 45, 102, 300"
        placeholderTextColor="#6B7280"
        keyboardType={keyboardType}
        multiline
        autoCapitalize="none"
        autoCorrect={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 14 },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: { fontSize: 14, fontWeight: '600', color: '#9CA3AF' },
  countBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  countText: { fontSize: 13, fontWeight: '800' },
  input: {
    backgroundColor: '#111827',
    color: '#F9FAFB',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    borderWidth: 1,
    minHeight: 52,
    lineHeight: 20,
  },
});
