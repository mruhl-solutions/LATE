import { Stack } from 'expo-router';

export default function RadarLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen
        name="proponer"
        options={{ presentation: 'modal', headerShown: true, title: 'Nueva propuesta' }}
      />
    </Stack>
  );
}
