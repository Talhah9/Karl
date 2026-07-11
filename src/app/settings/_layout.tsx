import { Stack } from 'expo-router';
import { C } from '@/constants/colors';

export default function SettingsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: C.bg },
      }}
    />
  );
}
