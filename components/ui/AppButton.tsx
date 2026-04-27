import { Pressable, Text, StyleSheet, ActivityIndicator } from 'react-native';

interface AppButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  loading?: boolean;
  disabled?: boolean;
}

export function AppButton({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
}: AppButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      style={[styles.base, styles[variant], isDisabled && styles.disabled]}
      onPress={onPress}
      disabled={isDisabled}
    >
      {loading ? (
        <ActivityIndicator color="#fff" size="small" />
      ) : (
        <Text style={[styles.label, variant === 'secondary' && styles.labelSecondary]}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 8,
  },
  primary: { backgroundColor: '#7C3AED' },
  secondary: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#7C3AED' },
  danger: { backgroundColor: '#EF4444' },
  disabled: { opacity: 0.5 },
  label: { color: '#fff', fontWeight: '700', fontSize: 16 },
  labelSecondary: { color: '#7C3AED' },
});
