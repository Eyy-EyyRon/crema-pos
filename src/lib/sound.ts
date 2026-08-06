import { Vibration } from 'react-native';
import { warning } from './haptics';

// Reduced-fidelity alert for a new order landing in the queue while this terminal didn't fire
// it — deliberately NOT a real audio chime. Adding one would mean a new native dependency
// (expo-audio) plus a bundled sound asset, both of which need a native rebuild and on-device
// verification neither of which is possible in this environment. A distinct vibration pattern
// (longer/more insistent than the single warning() pulse used elsewhere) plus the visual banner
// covers the same "I'm not looking at the screen" case for a terminal that's usually within
// arm's reach, without shipping an unverified native dependency.
export function playNewOrderChime(): void {
  try {
    warning();
    Vibration.vibrate([0, 180, 90, 180]);
  } catch {
    // never let an alert failure break the queue update it's attached to
  }
}
