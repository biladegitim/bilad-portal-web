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
  } catch {}
}
