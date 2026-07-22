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
    const response = await apiFetch("/notifications", {
      headers: authHeaders(),
    });

    if (!response.ok) return 0;

    const data = await response.json();

    return (data.notifications || []).filter(
      (item: NotificationItem) => item.link === "/leaves" && !item.is_read
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

export async function subscribeToPushNotifications() {
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

  const permission =
    Notification.permission === "default"
      ? await Notification.requestPermission()
      : Notification.permission;

  if (permission !== "granted") return;

  const registration = await navigator.serviceWorker.ready;
  const existingSubscription =
    await registration.pushManager.getSubscription();
  const subscription =
    existingSubscription ||
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(keyData.public_key),
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
