import { Redirect } from 'expo-router';

/** The old single-page setup now lives in the step-by-step onboarding. */
export default function Setup() {
  return <Redirect href="/onboarding" />;
}
