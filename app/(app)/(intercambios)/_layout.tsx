import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Slot, useRouter, usePathname } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

const TABS = [
  { label: 'Recibidas', path: 'recibidas' },
  { label: 'Enviadas', path: 'enviadas' },
];

export default function IntercambiosLayout() {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Text style={styles.title}>Intercambios</Text>
      <View style={styles.tabBar}>
        {TABS.map((tab) => {
          const isActive = pathname.includes(tab.path);
          return (
            <Pressable
              key={tab.path}
              style={[styles.tab, isActive && styles.activeTab]}
              onPress={() => router.push(`/(app)/(intercambios)/${tab.path}` as never)}
            >
              <Text style={[styles.tabLabel, isActive && styles.activeTabLabel]}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Slot />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F0F' },
  title: { fontSize: 28, fontWeight: '800', color: '#F5F5F5', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 8,
    backgroundColor: '#1C1C1E',
    borderRadius: 10,
    padding: 3,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  activeTab: { backgroundColor: '#FF6B35' },
  tabLabel: { fontSize: 14, fontWeight: '600', color: '#636366' },
  activeTabLabel: { color: '#FFFFFF' },
});
