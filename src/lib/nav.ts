import { router, type Href } from 'expo-router';

/** Replaces the whole stack with one screen, so "back" can't return to the previous flow. */
export function resetTo(href: Href) {
  if (router.canDismiss()) router.dismissAll();
  router.replace(href);
}
