import { Pressable, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { C } from '@/constants/colors';

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
        <ActivityIndicator color={variant === 'primary' ? C.bg : C.primary} size="small" />
      ) : (
        <Text style={[styles.label, variant !== 'primary' && styles.labelAlt]}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 8,
  },
  primary: { backgroundColor: C.primary },
  secondary: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: C.primary },
  danger: { backgroundColor: C.danger },
  disabled: { opacity: 0.5 },
  label: { color: C.bg, fontWeight: '800', fontSize: 16 },
  labelAlt: { color: C.primary },
});
