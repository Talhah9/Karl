import { Tabs } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C } from '@/constants/colors';
import { useApp } from '@/context/AppContext';

function HomeIcon({ focused }: { focused: boolean }) {
  return (
    <View
      style={[
        styles.homeIcon,
        { borderColor: focused ? C.lime : C.muted },
        focused && { borderTopWidth: 5 },
      ]}
    />
  );
}

function ChatIcon({ focused }: { focused: boolean }) {
  return (
    <View
      style={[
        styles.chatIcon,
        { borderColor: focused ? C.lime : C.muted },
      ]}
    />
  );
}

function BarsIcon({ focused }: { focused: boolean }) {
  const color = focused ? C.lime : C.muted;
  return (
    <View style={styles.barsRow}>
      <View style={[styles.bar1, { backgroundColor: color }]} />
      <View style={[styles.bar2, { backgroundColor: color }]} />
      <View style={[styles.bar3, { backgroundColor: color }]} />
    </View>
  );
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const { profile } = useApp();
  const accent = profile === 'perso' ? C.purple : C.lime;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          ...styles.tabBar,
          paddingBottom: Math.max(insets.bottom - 8, 4),
          height: 70 + Math.max(insets.bottom - 8, 0),
        },
        tabBarActiveTintColor: accent,
        tabBarInactiveTintColor: C.muted,
        tabBarLabelStyle: styles.tabLabel,
        tabBarBackground: () => (
          <View style={[StyleSheet.absoluteFill, styles.tabBg]} />
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Accueil',
          tabBarIcon: ({ focused }) => <HomeIcon focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Karl',
          tabBarIcon: ({ focused }) => <ChatIcon focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="add"
        options={{
          title: '',
          tabBarIcon: () => (
            <View style={[styles.fab, { backgroundColor: accent }]}>
              <Text style={styles.fabPlus}>+</Text>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="projection"
        options={{
          title: 'Analyse',
          tabBarIcon: ({ focused }) => <BarsIcon focused={focused} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: 'rgba(10,9,8,0.82)',
    borderTopWidth: 1,
    borderTopColor: C.line,
  },
  tabBg: {
    backgroundColor: 'rgba(10,9,8,0.82)',
  },
  tabLabel: {
    fontFamily: 'SpaceMono_400Regular',
    fontSize: 8,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  homeIcon: {
    width: 17,
    height: 16,
    borderWidth: 2,
    borderRadius: 3,
    borderTopWidth: 2,
  },
  chatIcon: {
    width: 17,
    height: 15,
    borderWidth: 2,
    borderRadius: 8,
    borderBottomLeftRadius: 2,
  },
  barsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
    height: 16,
  },
  bar1: { width: 4, height: 7, borderRadius: 1 },
  bar2: { width: 4, height: 12, borderRadius: 1 },
  bar3: { width: 4, height: 16, borderRadius: 1 },
  fab: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -14,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.55,
    shadowRadius: 12,
    elevation: 8,
  },
  fabPlus: {
    fontSize: 26,
    color: C.dark,
    lineHeight: 30,
    fontFamily: 'Sora_400Regular',
  },
});
