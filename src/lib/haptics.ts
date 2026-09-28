/**
 * Apple HIG-compliant subtle haptic feedback utilities for mobile touch interactions
 * Gracefully degrades on unsupported browsers and non-touch devices.
 */
export function triggerHaptic(type: 'light' | 'medium' | 'success' | 'warning' = 'light') {
  if (typeof navigator === 'undefined' || !navigator.vibrate) return;

  try {
    switch (type) {
      case 'light':
        navigator.vibrate(10);
        break;
      case 'medium':
        navigator.vibrate(20);
        break;
      case 'success':
        navigator.vibrate([12, 35, 18]);
        break;
      case 'warning':
        navigator.vibrate([30, 40, 25]);
        break;
    }
  } catch {
    // Ignore any vibration errors
  }
}
