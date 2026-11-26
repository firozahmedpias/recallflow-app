const NOTIFIED_DATE_KEY = 'recallflow_last_notified_date';

export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!isNotificationSupported()) return 'unsupported';
  try {
    const result = await Notification.requestPermission();
    return result;
  } catch {
    return Notification.permission;
  }
}

export async function sendBrowserNotification(title: string, body: string): Promise<boolean> {
  if (!isNotificationSupported() || Notification.permission !== 'granted') {
    return false;
  }

  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) {
        await reg.showNotification(title, {
          body,
          icon: '/pwa-192x192.png',
          badge: '/pwa-192x192.png',
          tag: 'recallflow-revision-reminder',
        });
        return true;
      }
    }

    new Notification(title, {
      body,
      icon: '/pwa-192x192.png',
      tag: 'recallflow-revision-reminder',
    });
    return true;
  } catch {
    return false;
  }
}

export async function notifyDueRevisionsIfNeeded(
  dueCount: number,
  overdueCount: number,
  todayISO: string
): Promise<void> {
  if (dueCount + overdueCount === 0) return;
  if (!isNotificationSupported() || Notification.permission !== 'granted') return;

  try {
    const lastNotified = localStorage.getItem(NOTIFIED_DATE_KEY);
    if (lastNotified === todayISO) return;

    const parts: string[] = [];
    if (dueCount > 0) parts.push(`${dueCount} due today`);
    if (overdueCount > 0) parts.push(`${overdueCount} overdue`);

    const sent = await sendBrowserNotification(
      'RecallFlow Revision Reminder',
      `You have ${parts.join(' and ')} ready to revise.`
    );
    if (sent) {
      localStorage.setItem(NOTIFIED_DATE_KEY, todayISO);
    }
  } catch {
    // Ignore storage/notification failures
  }
}
