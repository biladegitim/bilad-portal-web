"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import { getAccessToken } from "@/lib/auth";
import {
  fetchUnreadLeaveNotificationCount,
  updateAppBadge,
} from "@/lib/notifications";

export function useLeaveNotifications() {
  const pathname = usePathname();
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    if (!getAccessToken()) {
      setCount(0);
      updateAppBadge(0);
      return;
    }

    const unreadCount = await fetchUnreadLeaveNotificationCount();
    setCount(unreadCount);
    updateAppBadge(unreadCount);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const timer = setTimeout(refresh, 300);

    return () => clearTimeout(timer);
  }, [pathname, refresh]);

  return { count, refresh };
}
