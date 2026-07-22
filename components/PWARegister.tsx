"use client";

import { useEffect } from "react";

import { getAccessToken } from "@/lib/auth";
import { subscribeToPushNotifications } from "@/lib/notifications";

export default function PWARegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("/sw.js")
        .then(() => {
          if (!getAccessToken()) return;

          subscribeToPushNotifications().catch(() => {
            // Push support should never block the portal.
          });
        })
        .catch(() => {
          // PWA should never block the portal if registration fails.
        });
    });
  }, []);

  return null;
}
