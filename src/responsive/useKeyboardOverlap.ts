import { useEffect, useRef, useState } from 'react';
import { Dimensions, Keyboard, KeyboardEvent, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Extra pixels to lift above the software keyboard.
 *
 * Android `adjustResize` already shrinks the window — adding the full keyboard height on top
 * of that would double-pad. iOS (and Android when resize is broken by a translucent status bar)
 * does not shrink the window, so we apply the keyboard height ourselves.
 */
export function useKeyboardOverlap(): number {
  const insets = useSafeAreaInsets();
  const [overlap, setOverlap] = useState(0);
  const restHeight = useRef(Dimensions.get('window').height);

  useEffect(() => {
    if (overlap === 0) {
      restHeight.current = Dimensions.get('window').height;
    }
  }, [overlap]);

  useEffect(() => {
    const onShow = (e: KeyboardEvent) => {
      const kb = e.endCoordinates?.height ?? 0;
      if (kb <= 0) {
        setOverlap(0);
        return;
      }
      const win = Dimensions.get('window').height;
      const alreadyResized = Math.max(0, restHeight.current - win);
      const iosHome = Platform.OS === 'ios' ? insets.bottom : 0;
      setOverlap(Math.max(0, Math.round(kb - alreadyResized - iosHome)));
    };
    const onHide = () => setOverlap(0);
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvt, onShow);
    const hide = Keyboard.addListener(hideEvt, onHide);
    const change = Platform.OS === 'android'
      ? Keyboard.addListener('keyboardDidChangeFrame', onShow)
      : null;
    return () => {
      show.remove();
      hide.remove();
      change?.remove();
    };
  }, [insets.bottom]);

  return overlap;
}
