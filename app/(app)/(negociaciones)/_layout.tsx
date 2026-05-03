import { Stack } from 'expo-router';
import { C } from '@/constants/colors';

export default function NegociacionesLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen
        name="[id]"
        options={{
          headerShown: true,
          headerStyle: { backgroundColor: C.surface },
          headerTintColor: C.primary,
          headerTitleStyle: { color: C.textPrimary, fontWeight: '700' },
          headerShadowVisible: false,
        }}
      />
    </Stack>
  );
}
