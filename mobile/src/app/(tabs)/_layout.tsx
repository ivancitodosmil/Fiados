import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router/js-tabs';
import type { ComponentProps } from 'react';

import { haptic } from '@/lib/haptics';
import { C, F, shadowTabBar } from '@/lib/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

const TABS: { name: string; title: string; icon: IconName; iconOn: IconName }[] = [
  { name: 'index', title: 'Inicio', icon: 'home-outline', iconOn: 'home' },
  { name: 'clientes', title: 'Clientes', icon: 'people-outline', iconOn: 'people' },
  { name: 'cobros', title: 'Cobros', icon: 'cash-outline', iconOn: 'cash' },
  { name: 'ajustes', title: 'Ajustes', icon: 'settings-outline', iconOn: 'settings' },
];

export default function TabsLayout() {
  return (
    <Tabs
      screenListeners={{ tabPress: () => haptic('select') }}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.verde,
        tabBarInactiveTintColor: C.gris,
        tabBarStyle: {
          backgroundColor: C.blanco,
          borderTopWidth: 0,
          elevation: 0,
          minHeight: 64,
          paddingTop: 6,
          ...shadowTabBar,
        },
        tabBarLabelStyle: { fontFamily: F.medium, fontSize: 12 },
        sceneStyle: { backgroundColor: C.blanco },
      }}>
      {TABS.map((t) => (
        <Tabs.Screen
          key={t.name}
          name={t.name}
          options={{
            title: t.title,
            tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? t.iconOn : t.icon} size={24} color={color as string} />,
          }}
        />
      ))}
    </Tabs>
  );
}
