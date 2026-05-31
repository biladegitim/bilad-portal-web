"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import Sidebar from "@/components/Sidebar";
import { QRCodeSVG } from "qrcode.react";

import { apiFetch } from "@/lib/api";
import { authHeaders, getAccessToken } from "@/lib/auth";
import { FRONTEND_URL } from "@/lib/config";

type QRData = {
  token: string;
  expires_at: string;
};

export default function QRPage() {
  const router = useRouter();

  const [qrData, setQrData] = useState<QRData | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchQR() {
    try {
      const response = await apiFetch("/qr/current", {
        headers: authHeaders(),
      });

      if (!response.ok) {
        throw new Error("QR alınamadı");
      }

      const data = await response.json();

      setQrData(data);
    } catch {
      setQrData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!getAccessToken()) {
      router.push("/login");
      return;
    }

    fetchQR();

    const interval = setInterval(() => {
      fetchQR();
    }, 15000);

    return () => clearInterval(interval);
  }, [router]);

  function formatExpireDate(date: string) {
    return new Date(date).toLocaleString("tr-TR", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div className="flex min-h-screen bg-[#F6F9FF]">
      <Sidebar />

      <main className="min-w-0 flex-1 px-4 py-4 md:p-8">
        <div className="mx-auto flex min-h-[calc(100vh-32px)] max-w-7xl min-w-0 flex-col">
          <header className="mb-5 md:mb-8">
            <div className="flex h-14 items-center justify-between md:h-16">
              <div className="h-11 w-11 md:hidden" />
            </div>

            <div className="mt-5 md:mt-6">
              <h1 className="text-2xl font-bold tracking-tight text-slate-800 md:text-3xl">
                QR Giriş Ekranı
              </h1>

              <p className="mt-1.5 text-sm text-slate-400 md:text-base">
                Bu ekran tablet veya giriş noktasındaki cihazda açık bırakılır.
              </p>
            </div>
          </header>

          <section className="flex flex-1 items-center justify-center py-6 md:py-10">
            <div className="w-full max-w-xl rounded-2xl border border-[#E6EEF9] bg-white p-4 text-center shadow-sm md:rounded-3xl md:p-5">
              <div className="mb-4 flex items-center justify-center gap-3">
                <span className="text-lg leading-none md:text-xl">𖣯</span>

                <div className="text-left">
                  <h2 className="text-lg font-bold text-slate-800 md:text-xl">
                    Canlı QR Kod
                  </h2>

                  <p className="text-sm text-slate-400">
                    QR kod 15 saniyede bir yenilenir.
                  </p>
                </div>
              </div>

              {loading ? (
                <div className="rounded-2xl bg-[#F8FBFF] p-8 text-sm text-slate-400 md:p-10 md:text-base">
                  QR yükleniyor...
                </div>
              ) : qrData ? (
                <>
                  <div className="mx-auto flex w-full max-w-[320px] justify-center rounded-2xl border border-[#E6EEF9] bg-[#F8FBFF] p-4 sm:p-5 md:p-6">
                    <QRCodeSVG
                      value={`${FRONTEND_URL}/qr-scan?token=${qrData.token}`}
                      size={280}
                      className="h-auto w-full max-w-full"
                    />
                  </div>

                  <div className="mt-5 rounded-2xl bg-[#F8FBFF] p-4">
                    <p className="text-sm font-semibold text-sky-700 md:text-base">
                      QR kod aktif
                    </p>

                    <p className="mt-1 text-xs text-slate-500 md:text-sm">
                      Son geçerlilik:{" "}
                      {formatExpireDate(qrData.expires_at)}
                    </p>
                  </div>
                </>
              ) : (
                <div className="rounded-2xl bg-red-50 p-5 text-sm font-medium text-red-600">
                  QR alınamadı. Backend bağlantısını kontrol edin.
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
