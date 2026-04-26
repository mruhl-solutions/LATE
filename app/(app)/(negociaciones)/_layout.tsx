import { Stack } from 'expo-router';

export default function NegociacionesLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen
        name="[id]"
        options={{
          headerShown: true,
          headerStyle: { backgroundColor: '#1C1C1E' },
          headerTintColor: '#FF6B35',
          headerTitleStyle: { color: '#F5F5F5', fontWeight: '700' },
        }}
      />
    </Stack>
  );
}
