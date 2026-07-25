"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import { apiFetch } from "@/lib/api";
import { authHeaders, getAccessToken } from "@/lib/auth";
import { subscribeToPushNotifications } from "@/lib/notifications";

type PushStatus = {
  push_enabled: boolean;
  push_subscription_count: number;
};

type PromptState = "hidden" | "needs-permission" | "blocked" | "ready";

export default function PushNotificationPrompt() {
  const pathname = usePathname();
  const [promptState, setPromptState] = useState<PromptState>("hidden");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const browserSupportsPush = useCallback(() => {
    return (
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window
    );
  }, []);

  const refreshStatus = useCallback(async () => {
    if (!getAccessToken() || !browserSupportsPush()) {
      setPromptState("hidden");
      return null;
    }

    const response = await apiFetch("/notifications/push/status", {
      headers: authHeaders(),
    });

    if (!response.ok) {
      setPromptState("hidden");
      return null;
    }

    const status = (await response.json()) as PushStatus;

    if (!status.push_enabled) {
      setPromptState("hidden");
      return status;
    }

    if (Notification.permission === "denied") {
      setPromptState("blocked");
      return status;
    }

    if (Notification.permission === "granted") {
      setPromptState(
        status.push_subscription_count > 0 ? "ready" : "needs-permission"
      );
      return status;
    }

    setPromptState("needs-permission");
    return status;
  }, [browserSupportsPush]);

  useEffect(() => {
    if (dismissed || pathname === "/login" || pathname.startsWith("/qr")) {
      setPromptState("hidden");
      return;
    }

    refreshStatus().catch(() => setPromptState("hidden"));
  }, [dismissed, pathname, refreshStatus]);

  async function handleEnableAndTest() {
    setLoading(true);
    setMessage("");

    try {
      await subscribeToPushNotifications({ requestPermission: true });
      const status = await refreshStatus();

      if (Notification.permission !== "granted") {
        setMessage("Bildirim izni verilmedi. Telefon ayarlarından izin açılmalı.");
        return;
      }

      if (!status || status.push_subscription_count < 1) {
        setMessage("Abonelik kaydedilemedi. Sayfayı yenileyip tekrar deneyin.");
        return;
      }

      const response = await apiFetch("/notifications/push/test", {
        method: "POST",
        headers: authHeaders(),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setMessage("Test bildirimi gönderilemedi.");
        return;
      }

      const sent = Number(data?.push?.sent || 0);
      const failed = Number(data?.push?.failed || 0);

      if (sent > 0) {
        setMessage("Test bildirimi gönderildi. Telefonun üst bildirim alanını kontrol edin.");
        setPromptState("ready");
        return;
      }

      setMessage(
        failed > 0
          ? "Abonelik var ama push servisi reddetti. Birazdan tekrar deneyin."
          : "Aktif cihaz aboneliği bulunamadı. Sayfayı yenileyip tekrar deneyin."
      );
    } catch {
      setMessage("Telefon bildirimi hazırlanırken hata oluştu.");
    } finally {
      setLoading(false);
    }
  }

  if (dismissed || promptState === "hidden") return null;

  const isBlocked = promptState === "blocked";
  const isReady = promptState === "ready";

  return (
    <div className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-md rounded-3xl border border-sky-100 bg-white p-4 shadow-2xl shadow-slate-200/70">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-lg font-bold text-sky-700">
          !
        </div>

        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-bold text-slate-900">
            Telefon bildirimi testi
          </h2>

          <p className="mt-1 text-xs leading-5 text-slate-500">
            {isBlocked
              ? "Üst bildirimler telefon veya Chrome ayarlarında kapalı görünüyor."
              : isReady
                ? "Bu cihaz bildirim için kayıtlı. Üst bildirimi doğrulamak için test gönderebilirsiniz."
                : "Üst bildirimlerin gelmesi için bu cihazda bir kez izin verip test bildirimi gönderin."}
          </p>

          {message && (
            <p className="mt-2 rounded-2xl bg-[#F8FBFF] px-3 py-2 text-xs leading-5 text-slate-600">
              {message}
            </p>
          )}

          <div className="mt-3 flex gap-2">
            {!isBlocked && (
              <button
                type="button"
                onClick={handleEnableAndTest}
                disabled={loading}
                className="h-10 rounded-2xl bg-sky-600 px-4 text-xs font-semibold text-white shadow-sm transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Deneniyor..." : isReady ? "Test gönder" : "Aç ve test et"}
              </button>
            )}

            <button
              type="button"
              onClick={() => setDismissed(true)}
              className="h-10 rounded-2xl border border-[#E6EEF9] bg-white px-4 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              Kapat
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
