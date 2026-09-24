import { useEffect, useState } from 'react';
import { Keyboard, LayoutAnimation, Platform, type LayoutChangeEvent } from 'react-native';

/** How much of a screen `height` tall (from the top of the window) a keyboard starting at `top` covers. */
export function keyboardOverlap(height: number, top: number | null): number {
  return top == null || height <= 0 ? 0 : Math.max(0, Math.round(height - top));
}

/**
 * Where the on-screen keyboard starts (its top edge, from the top of the window), or null while
 * it's hidden. Android draws the app edge to edge, so the window no longer shrinks for the
 * keyboard: screens move their own inputs above it.
 */
export function useKeyboardTop(): number | null {
  const [top, setTop] = useState<number | null>(null);
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const ios = Platform.OS === 'ios';
    const move = (next: number | null, duration?: number) => {
      // iOS reports the keyboard before it slides in, so the input can slide with it.
      if (ios && duration) LayoutAnimation.configureNext(LayoutAnimation.create(duration, LayoutAnimation.Types.keyboard, LayoutAnimation.Properties.opacity));
      setTop(next);
    };
    const shown = Keyboard.addListener(ios ? 'keyboardWillShow' : 'keyboardDidShow', (e) => move(e.endCoordinates.screenY, e.duration));
    const hidden = Keyboard.addListener(ios ? 'keyboardWillHide' : 'keyboardDidHide', (e) => move(null, e.duration));
    return () => {
      shown.remove();
      hidden.remove();
    };
  }, []);
  return top;
}

/**
 * For a screen that fills the window: how much of it the keyboard covers. Put `onLayout` on the
 * screen's outer view; if the system does shrink the window for the keyboard, this stays 0.
 */
export function useKeyboardOverlap(): { overlap: number; onLayout: (e: LayoutChangeEvent) => void } {
  const top = useKeyboardTop();
  const [height, setHeight] = useState(0);
  return { overlap: keyboardOverlap(height, top), onLayout: (e) => setHeight(e.nativeEvent.layout.height) };
}
