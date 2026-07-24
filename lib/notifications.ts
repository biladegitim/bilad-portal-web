import { apiFetch } from "@/lib/api";
import { authHeaders } from "@/lib/auth";

type NotificationItem = {
  id: number;
  title: string;
  message: string;
  link: string;
  is_read: boolean;
  created_at: string;
};

export async function fetchUnreadLeaveNotificationCount() {
  try {
    const countResponse = await apiFetch("/notifications/leaves/unread-count", {
      headers: authHeaders(),
    });

    if (countResponse.ok) {
      const countData = await countResponse.json();
      return countData.unread_count || 0;
    }

    const response = await apiFetch("/notifications", {
      headers: authHeaders(),
    });

    if (!response.ok) return 0;

    const data = await response.json();

    return (data.notifications || []).filter(
      (item: NotificationItem) =>
        ["/leaves", "/my-leaves"].includes(item.link) && !item.is_read
    ).length;
  } catch {
    return 0;
  }
}

export async function markLeaveNotificationsRead() {
  try {
    await apiFetch("/notifications/read-leaves", {
      method: "PATCH",
      headers: authHeaders(),
    });

    await updateAppBadge(0);
  } catch {}
}

export async function updateAppBadge(count: number) {
  if (typeof navigator === "undefined") return;

  const badgedNavigator = navigator as Navigator & {
    setAppBadge?: (contents?: number) => Promise<void>;
    clearAppBadge?: () => Promise<void>;
  };

  try {
    if (count > 0 && badgedNavigator.setAppBadge) {
      await badgedNavigator.setAppBadge(count);
    } else if (badgedNavigator.clearAppBadge) {
      await badgedNavigator.clearAppBadge();
    }
  } catch {}
}

type SubscribeOptions = {
  requestPermission?: boolean;
};

export async function subscribeToPushNotifications(
  options: SubscribeOptions = {}
) {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;
  if (!("PushManager" in window)) return;
  if (!("Notification" in window)) return;

  const keyResponse = await apiFetch("/push/public-key", {
    headers: authHeaders(),
  });

  if (!keyResponse.ok) return;

  const keyData = await keyResponse.json();

  if (!keyData.enabled || !keyData.public_key) return;

  const shouldRequestPermission = options.requestPermission ?? true;
  const permission =
    Notification.permission === "default"
      ? shouldRequestPermission
        ? await Notification.requestPermission()
        : Notification.permission
      : Notification.permission;

  if (permission !== "granted") return;

  const registration = await getServiceWorkerRegistration();
  const applicationServerKey = urlBase64ToUint8Array(keyData.public_key);
  const existingSubscription =
    await registration.pushManager.getSubscription();

  if (
    existingSubscription &&
    !subscriptionUsesKey(existingSubscription, applicationServerKey)
  ) {
    await existingSubscription.unsubscribe().catch(() => false);
  }

  const currentSubscription =
    await registration.pushManager.getSubscription();
  const subscription =
    currentSubscription ||
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey,
    }));

  await apiFetch("/push/subscriptions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify(subscription.toJSON()),
  });
}

async function getServiceWorkerRegistration() {
  const existingRegistration = await navigator.serviceWorker.getRegistration();

  if (existingRegistration) {
    return existingRegistration;
  }

  return navigator.serviceWorker.register("/sw.js");
}

function subscriptionUsesKey(
  subscription: PushSubscription,
  applicationServerKey: Uint8Array
) {
  const existingKey = subscription.options.applicationServerKey;

  if (!existingKey) return false;

  const existingKeyArray = new Uint8Array(existingKey);

  if (existingKeyArray.length !== applicationServerKey.length) return false;

  return existingKeyArray.every(
    (value, index) => value === applicationServerKey[index]
  );
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}
