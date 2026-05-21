"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { useLeaveNotifications } from "@/hooks/useLeaveNotifications";
import { useProfileAccess } from "@/hooks/useProfileAccess";

const menuItems = [
  { title: "Ana Sayfa", href: "/", icon: "🏠" },
  { title: "Etkinlikler", href: "/events", icon: "📌" },
  { title: "Takvim", href: "/calendar", icon: "🗓️" },
  { title: "İzinler", href: "/leaves", icon: "📝" },
  { title: "QR Okut", href: "/qr-scan", icon: "📱" },
  { title: "QR Ekranı", href: "/qr", icon: "▣" },
  { title: "Kat Planı", href: "/rooms", icon: "🏢" },
  { title: "Menü", href: "/menu", icon: "🍽" },
  { title: "Giriş-Çıkış", href: "/attendance", icon: "📊" },
  { title: "Kullanıcılar", href: "/users", icon: "👥" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { access } = useProfileAccess();
  const { count: leaveNotificationCount } = useLeaveNotifications();

  const [mobileOpen, setMobileOpen] = useState(false);
  const role = access?.role;
  const isSuperAdmin = role === "super_admin";
  const isAdmin = role === "admin" || role === "super_admin";

  function handleLogout() {
    localStorage.clear();
    window.location.href = "/login";
  }

  const visibleItems = menuItems.filter((item) => {
    if (item.href === "/users" || item.href === "/qr") {
      return isSuperAdmin;
    }

    if (item.href === "/attendance") {
      return isAdmin;
    }

    return true;
  });

  function renderNavItem(item: (typeof menuItems)[number], closeOnClick = false) {
    const active = pathname === item.href;

    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={() => closeOnClick && setMobileOpen(false)}
        className={`flex h-11 items-center gap-3 rounded-2xl px-3 text-sm font-medium transition ${
          active
            ? "bg-sky-50 text-sky-700"
            : "text-slate-600 hover:bg-[#F6F9FF]"
        }`}
      >
        <span className="flex h-6 w-6 shrink-0 items-center justify-center text-base leading-none">
          {item.icon}
        </span>

        <span className="flex min-w-0 flex-1 items-center justify-between gap-2">
          <span className="truncate">{item.title}</span>

          {item.href === "/leaves" && leaveNotificationCount > 0 && (
            <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
              {leaveNotificationCount}
            </span>
          )}
        </span>
      </Link>
    );
  }

  return (
    <>
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-4 z-50 flex h-11 w-11 items-center justify-center rounded-2xl border border-[#E6EEF9] bg-white text-lg text-slate-700 shadow-sm transition active:scale-95 md:hidden"
        aria-label="Menüyü aç"
      >
        ☰
      </button>

      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm md:hidden"
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-50 flex h-full w-[265px] flex-col border-r border-[#E6EEF9] bg-white px-4 py-5 shadow-2xl transition-transform duration-300 md:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="mb-7 flex items-center justify-between">
          <img src="/logo.png" alt="Bilad" className="h-11 object-contain" />

          <button
            onClick={() => setMobileOpen(false)}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F6F9FF] text-sm text-slate-600 transition active:scale-95"
            aria-label="Menüyü kapat"
          >
            ✕
          </button>
        </div>

        <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto pb-5">
          {visibleItems.map((item) => renderNavItem(item, true))}
        </nav>

        <div className="border-t border-[#E6EEF9] pt-4">
          <button
            type="button"
            onClick={handleLogout}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-red-50 px-4 text-sm font-semibold text-red-600 transition hover:bg-red-100 active:scale-[0.98]"
          >
            <span className="flex h-5 w-5 items-center justify-center" aria-hidden="true">
              ↪
            </span>
            <span>Çıkış Yap</span>
          </button>
        </div>
      </aside>

      <aside className="hidden min-h-screen w-64 overflow-y-auto border-r border-[#E6EEF9] bg-white px-4 py-5 md:block">
        <div className="mb-8">
          <img src="/logo.png" alt="Bilad" className="h-14 object-contain" />
        </div>

        <nav className="space-y-1">
          {visibleItems.map((item) => renderNavItem(item))}
        </nav>
      </aside>
    </>
  );
}
