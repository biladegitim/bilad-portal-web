"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

import { getAccessToken, getStoredUserRole } from "@/lib/auth";

export default function QrRoleGuard() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!getAccessToken()) return;
    if (getStoredUserRole() !== "qr") return;
    if (pathname === "/qr") return;

    router.replace("/qr");
  }, [pathname, router]);

  return null;
}
