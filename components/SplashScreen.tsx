"use client";

import Image from "next/image";

export default function SplashScreen() {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-gradient-to-br from-sky-50 via-white to-blue-100">
      <div className="flex flex-col items-center">
        <Image
          src="/splash-logo.png"
          alt="Bilad Logo"
          width={700}
          height={686}
          priority
          sizes="(max-width: 768px) 82vw, 700px"
          className="h-auto w-[min(82vw,700px)] animate-pulse object-contain"
        />

        <div className="mt-8 h-10 w-10 animate-spin rounded-full border-4 border-sky-100 border-t-sky-600" />

        <p className="mt-5 text-sm font-medium text-slate-500">
          Bilad Portal yükleniyor...
        </p>
      </div>
    </div>
  );
}
