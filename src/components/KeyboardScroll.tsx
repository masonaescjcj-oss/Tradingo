import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View, type ScrollViewProps } from 'react-native';

import { keyboardOverlap, useKeyboardTop } from '@/lib/keyboard';

/**
 * A ScrollView for forms: while the keyboard is open it leaves room under the content and
 * scrolls the field being typed in above the keyboard (Android's edge-to-edge window doesn't
 * shrink for it on its own).
 */
export function KeyboardScroll({ contentContainerStyle, children, onScroll, ...props }: ScrollViewProps) {
  const frameRef = useRef<View>(null);
  const scrollRef = useRef<ScrollView>(null);
  const offset = useRef(0);
  const [bottom, setBottom] = useState(0);
  const top = useKeyboardTop();
  const overlap = keyboardOverlap(bottom, top);

  useEffect(() => {
    if (top == null) return;
    // Measured after the extra room is laid out, so there is space to scroll into.
    const id = requestAnimationFrame(() => {
      const input = TextInput.State.currentlyFocusedInput();
      input?.measureInWindow((_x, y, _w, h) => {
        const hidden = y + h + 24 - top;
        if (hidden > 0) scrollRef.current?.scrollTo({ y: offset.current + hidden, animated: true });
      });
    });
    return () => cancelAnimationFrame(id);
  }, [top]);

  return (
    <View
      ref={frameRef}
      style={styles.frame}
      onLayout={() => frameRef.current?.measureInWindow((_x, y, _w, h) => setBottom(y + h))}
    >
      <ScrollView
        ref={scrollRef}
        keyboardShouldPersistTaps="handled"
        {...props}
        onScroll={(e) => {
          offset.current = e.nativeEvent.contentOffset.y;
          onScroll?.(e);
        }}
        scrollEventThrottle={props.scrollEventThrottle ?? 32}
        contentContainerStyle={[contentContainerStyle, overlap > 0 && { paddingBottom: overlap + 24 }]}
      >
        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    flex: 1,
  },
});
