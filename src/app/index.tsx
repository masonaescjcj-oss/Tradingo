import { Redirect } from 'expo-router';

import { useGame } from '@/store/game';

export default function Index() {
  const onboarded = useGame((s) => s.onboarded);
  const signedOut = useGame((s) => s.signedOut);
  return <Redirect href={onboarded && !signedOut ? '/(tabs)' : '/welcome'} />;
}
