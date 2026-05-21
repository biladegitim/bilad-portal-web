"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { apiFetch } from "@/lib/api";
import { getAccessToken, jsonAuthHeaders } from "@/lib/auth";

function getOrCreateDeviceId() {
  let deviceId = localStorage.getItem("device_id");

  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem("device_id", deviceId);
  }

  return deviceId;
}

function ScanContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [message, setMessage] = useState("QR işleniyor...");
  const [success, setSuccess] = useState<boolean | null>(null);

  useEffect(() => {
    async function scan() {
      const token = searchParams.get("token");

      if (!getAccessToken()) {
        router.push("/login");
        return;
      }

      if (!token) {
        setSuccess(false);
        setMessage("QR token bulunamadı.");
        return;
      }

      const deviceId = getOrCreateDeviceId();

      try {
        const response = await apiFetch(
          "/attendance/scan",
          {
            method: "POST",
            headers: jsonAuthHeaders(),
            body: JSON.stringify({
              token,
              device_id: deviceId,
            }),
          }
        );

        const data = await response.json();

        if (!response.ok) {
          setSuccess(false);
          setMessage(data.detail || "QR okutma başarısız.");
          return;
        }

        setSuccess(true);

        setMessage(
          data.record_type === "check_in"
            ? "Giriş kaydınız oluşturuldu."
            : "Çıkış kaydınız oluşturuldu."
        );
      } catch {
        setSuccess(false);
        setMessage("Sunucuya bağlanılamadı.");
      }
    }

    scan();
  }, [router, searchParams]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-100 p-6">
      <div className="bg-white rounded-2xl shadow p-8 max-w-md w-full text-center">
        <h1 className="text-2xl font-bold mb-4">
          QR Giriş-Çıkış
        </h1>

        <p
          className={`text-lg font-medium ${
            success === false
              ? "text-red-600"
              : success === true
              ? "text-green-600"
              : "text-gray-700"
          }`}
        >
          {message}
        </p>

        <button
          onClick={() => router.push("/")}
          className="mt-6 bg-black text-white px-4 py-2 rounded-xl"
        >
          Ana Sayfaya Dön
        </button>
      </div>
    </main>
  );
}

export default function ScanPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-gray-100 p-6">
          <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow">
            QR işleniyor...
          </div>
        </main>
      }
    >
      <ScanContent />
    </Suspense>
  );
}
