import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

type Kind = 'light' | 'select' | 'success' | 'error' | 'warning';

export function haptic(kind: Kind = 'light') {
  if (Platform.OS === 'web') return;
  const p =
    kind === 'light'
      ? Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      : kind === 'select'
        ? Haptics.selectionAsync()
        : Haptics.notificationAsync(
            kind === 'success'
              ? Haptics.NotificationFeedbackType.Success
              : kind === 'error'
                ? Haptics.NotificationFeedbackType.Error
                : Haptics.NotificationFeedbackType.Warning,
          );
  p.catch(() => {});
}
