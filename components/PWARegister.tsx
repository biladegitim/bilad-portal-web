"use client";

import { useEffect } from "react";

import { getAccessToken } from "@/lib/auth";
import { subscribeToPushNotifications } from "@/lib/notifications";

export default function PWARegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    function registerServiceWorker() {
      navigator.serviceWorker
        .register("/sw.js")
        .then(async () => {
          if (getAccessToken()) {
            await subscribeToPushNotifications();
          }
        })
        .catch(() => {
          // PWA should never block the portal if registration fails.
        });
    }

    if (document.readyState === "complete") {
      registerServiceWorker();
      return;
    }

    window.addEventListener("load", registerServiceWorker);

    return () => window.removeEventListener("load", registerServiceWorker);
  }, []);

  return null;
}
