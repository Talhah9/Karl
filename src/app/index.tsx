import { Redirect } from 'expo-router';
import { useApp } from '@/context/AppContext';

export default function Index() {
  const { onboardingDone } = useApp();
  return <Redirect href={onboardingDone ? '/(tabs)' : '/onboarding/profile'} />;
}
