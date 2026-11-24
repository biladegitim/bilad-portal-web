"use client";

import { useEffect, useRef, useState } from "react";
import { beginDeviceMigration, completeDeviceMigration } from "@/lib/device";

export default function DeviceTransferPage() {
  const started = useRef(false);
  const [message, setMessage] = useState("Cihaz kaydı kontrol ediliyor…");

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    try {
      setMessage(completeDeviceMigration());
    } catch {
      setMessage("Tarayıcı cihaz kaydına erişilemedi. Gizli sekme yerine eski adresi kullandığınız normal tarayıcıdan deneyin.");
    }
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F6F9FF] p-5">
      <section className="w-full max-w-md rounded-3xl bg-white p-6 text-center shadow-sm">
        <h1 className="text-xl font-bold text-slate-800">Cihaz kaydını taşı</h1>
        <p role="status" className="mt-4 text-sm leading-6 text-slate-600">{message}</p>
        <a href="/qr-scan" className="mt-6 block rounded-2xl bg-sky-600 p-3 font-semibold text-white">QR Okut</a>
        <button onClick={() => beginDeviceMigration(true)} className="mt-4 text-sm text-sky-700">Aktarımı tekrar dene</button>
      </section>
    </main>
  );
}
