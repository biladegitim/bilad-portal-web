"use client";

import Image from "next/image";

export default function SplashScreen() {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-gradient-to-br from-sky-50 via-white to-blue-100">
      <div className="flex w-full max-w-4xl flex-col items-center px-6">
        <Image
          src="/splash-building.png"
          alt="Bilad binası çizimi"
          width={3958}
          height={3878}
          priority
          className="h-auto w-full max-w-[min(86vw,620px)] animate-pulse object-contain drop-shadow-sm md:max-w-[min(72vw,760px)]"
        />

        <div className="mt-6 h-10 w-10 animate-spin rounded-full border-4 border-sky-100 border-t-sky-600 md:mt-8" />

        <p className="mt-5 text-sm font-medium text-slate-500">
          Bilad Portal yükleniyor...
        </p>
      </div>
    </div>
  );
}
