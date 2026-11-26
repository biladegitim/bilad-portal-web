"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

import { getAccessToken, getStoredUserRole } from "@/lib/auth";

export default function QrRoleGuard() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!getAccessToken()) return;
    const role = getStoredUserRole();

    if (role === "qr") {
      if (pathname === "/qr") return;

      router.replace("/qr");
      return;
    }

    if (role === "volunteer") {
      if (pathname === "/rooms" || pathname === "/profile") return;

      router.replace("/rooms");
    }
  }, [pathname, router]);

  return null;
}
