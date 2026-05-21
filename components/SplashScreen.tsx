"use client";

export default function SplashScreen() {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-gradient-to-br from-sky-50 via-white to-blue-100">
      <div className="flex flex-col items-center">
        <img
          src="/logo.png"
          alt="Bilad Logo"
          className="h-28 w-auto animate-pulse object-contain"
        />

        <div className="mt-8 h-10 w-10 animate-spin rounded-full border-4 border-sky-100 border-t-sky-600" />

        <p className="mt-5 text-sm font-medium text-slate-500">
          Bilad Portal yükleniyor...
        </p>
      </div>
    </div>
  );
}