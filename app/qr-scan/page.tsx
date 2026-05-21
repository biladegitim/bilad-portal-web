"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import Sidebar from "@/components/Sidebar";
import { Html5Qrcode, Html5QrcodeScannerState } from "html5-qrcode";
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

function isExpectedVideoAbort(reason: unknown) {
  const name =
    reason instanceof DOMException || reason instanceof Error
      ? reason.name
      : "";
  const message =
    reason instanceof DOMException || reason instanceof Error
      ? reason.message
      : String(reason || "");

  return (
    name === "AbortError" ||
    message.includes("play() request was interrupted") ||
    message.includes("media was removed from the document")
  );
}

export default function QRScanPage() {
  const router = useRouter();

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const startedRef = useRef(false);
  const scannedRef = useRef(false);
  const startingRef = useRef(false);
  const stopAfterStartRef = useRef(false);

  const [message, setMessage] = useState("Kamera hazırlanıyor...");
  const [scanned, setScanned] = useState(false);
  const [success, setSuccess] = useState<boolean | null>(null);

  const stopReaderVideoTracks = useCallback(() => {
    const videos = document.querySelectorAll<HTMLVideoElement>(
      "#qr-reader video"
    );

    videos.forEach((video) => {
      const stream = video.srcObject;

      if (stream instanceof MediaStream) {
        stream.getTracks().forEach((track) => track.stop());
      }

      video.srcObject = null;
    });
  }, []);

  const stopScannerSafely = useCallback(async () => {
    if (startingRef.current) {
      stopAfterStartRef.current = true;
      return;
    }

    const scanner = scannerRef.current;

    if (scanner) {
      try {
        const state = scanner.getState();

        if (
          state === Html5QrcodeScannerState.SCANNING ||
          state === Html5QrcodeScannerState.PAUSED
        ) {
          await scanner.stop();
        }
      } catch {}

      try {
        await scanner.clear();
      } catch {}
    }

    scannerRef.current = null;
    startedRef.current = false;
    stopReaderVideoTracks();

    const reader = document.getElementById("qr-reader");

    if (reader) {
      reader.innerHTML = "";
    }
  }, [stopReaderVideoTracks]);

  useEffect(() => {
    function ignoreExpectedVideoAbort(event: PromiseRejectionEvent) {
      if (isExpectedVideoAbort(event.reason)) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    }

    window.addEventListener("unhandledrejection", ignoreExpectedVideoAbort, {
      capture: true,
    });

    const accessToken = getAccessToken();

    if (!accessToken) {
      router.push("/login");
      window.removeEventListener(
        "unhandledrejection",
        ignoreExpectedVideoAbort,
        { capture: true }
      );
      return;
    }

    if (startedRef.current) {
      window.removeEventListener(
        "unhandledrejection",
        ignoreExpectedVideoAbort,
        { capture: true }
      );
      return;
    }

    startedRef.current = true;

    let mounted = true;

    async function startScanner() {
      try {
        const reader = document.getElementById("qr-reader");

        if (reader) {
          reader.innerHTML = "";
        }

        const scanner = new Html5Qrcode("qr-reader");
        scannerRef.current = scanner;
        startingRef.current = true;

        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 260, height: 260 },
          },
          async (decodedText) => {
            if (scannedRef.current) return;

            scannedRef.current = true;

            if (!mounted) return;

            setScanned(true);
            setMessage("QR okundu, kayıt oluşturuluyor...");

            let token = decodedText.trim();

            if (token.includes("token=")) {
              try {
                const url = new URL(token);
                token = url.searchParams.get("token") || "";
              } catch {
                const match = token.match(/token=([^&]+)/);

                token = match
                  ? decodeURIComponent(match[1])
                  : "";
              }
            }

            if (!token) {
              setSuccess(false);
              setMessage("QR token bulunamadı.");

              await stopScannerSafely();
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
                setMessage(
                  data.detail || "QR okutma başarısız."
                );

                await stopScannerSafely();
                return;
              }

              setSuccess(true);

              setMessage(
                data.record_type === "check_in"
                  ? "Giriş kaydınız oluşturuldu."
                  : "Çıkış kaydınız oluşturuldu."
              );

              await stopScannerSafely();
            } catch {
              setSuccess(false);
              setMessage("Sunucuya bağlanılamadı.");

              await stopScannerSafely();
            }
          },
          () => {}
        );

        startingRef.current = false;

        if (stopAfterStartRef.current || !mounted) {
          stopAfterStartRef.current = false;
          await stopScannerSafely();
          return;
        }

        if (mounted) {
          setMessage("QR kodu kameraya okutun.");
        }
      } catch {
        startingRef.current = false;
        startedRef.current = false;

        if (!mounted || stopAfterStartRef.current) {
          stopAfterStartRef.current = false;
          await stopScannerSafely();
          return;
        }

        setSuccess(false);
        setMessage(
          "Kamera açılamadı. Kamera izni verdiğinizden emin olun."
        );
      }
    }

    const startTimer = window.setTimeout(() => {
      if (!mounted) return;
      void startScanner();
    }, 350);

    function handlePageHide() {
      mounted = false;
      void stopScannerSafely();
    }

    window.addEventListener("pagehide", handlePageHide);

    return () => {
      mounted = false;
      window.clearTimeout(startTimer);
      window.removeEventListener("pagehide", handlePageHide);
      window.removeEventListener(
        "unhandledrejection",
        ignoreExpectedVideoAbort,
        { capture: true }
      );
      void stopScannerSafely();
    };
  }, [router, stopScannerSafely]);

  return (
    <div className="flex min-h-screen bg-[#F6F9FF]">
      <Sidebar />

      <main className="flex-1 px-4 py-4 md:p-8">
        <div className="mx-auto flex min-h-[calc(100vh-32px)] max-w-7xl flex-col">
          <header className="mb-4 md:mb-8">
            <div className="flex h-14 items-center justify-between md:h-16">
              <div className="h-11 w-11 md:hidden" />
            </div>

            <div className="mt-4 md:mt-6">
              <h1 className="text-2xl font-bold tracking-tight text-slate-800 md:text-3xl">
                QR Okut
              </h1>

              <p className="mt-1.5 text-sm text-slate-400 md:text-base">
                Giriş veya çıkış kaydı için QR kodu kameraya gösterin.
              </p>
            </div>
          </header>

          <section className="flex flex-1 items-start justify-center pb-6 pt-2 md:items-center md:py-8">
            <div className="w-full max-w-md rounded-3xl border border-[#E6EEF9] bg-white p-4 text-center shadow-sm md:p-5">
              {!scanned && (
                <>
                  <div className="mb-4 flex items-center justify-center gap-3">
                    <span className="text-lg leading-none md:text-xl">
                      📱
                    </span>

                    <div className="text-left">
                      <h2 className="text-lg font-bold text-slate-800 md:text-xl">
                        Kamera ile QR Okut
                      </h2>

                      <p className="text-sm text-slate-400">
                        QR kodu çerçevenin içine hizalayın.
                      </p>
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-3xl border border-[#E6EEF9] bg-black">
                    <div
                      id="qr-reader"
                      className="
                        min-h-[320px]
                        w-full
                        overflow-hidden
                        bg-black
                        [&_*]:!box-border
                        [&_button]:hidden
                        [&_select]:hidden
                        [&_span]:hidden
                        [&_video]:!h-[320px]
                        [&_video]:!w-full
                        [&_video]:!object-cover
                      "
                    />
                  </div>

                  <div className="mt-4 rounded-2xl bg-[#F8FBFF] p-4">
                    <p className="text-sm text-slate-500">
                      {message}
                    </p>
                  </div>
                </>
              )}

              {scanned && (
                <>
                  <div
                    className={`rounded-2xl border p-6 ${
                      success
                        ? "border-emerald-100 bg-emerald-50"
                        : "border-red-100 bg-red-50"
                    }`}
                  >
                    <div className="mb-4 text-4xl">
                      {success ? "✅" : "⚠️"}
                    </div>

                    <p
                      className={`text-base font-semibold ${
                        success
                          ? "text-emerald-700"
                          : "text-red-700"
                      }`}
                    >
                      {message}
                    </p>
                  </div>

                  <button
                    onClick={() => window.location.reload()}
                    className="mt-5 h-11 w-full rounded-2xl bg-sky-600 px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700"
                  >
                    Tekrar Okut
                  </button>
                </>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
