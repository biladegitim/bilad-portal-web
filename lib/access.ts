import { apiFetch } from "@/lib/api";
import { authHeaders } from "@/lib/auth";

export type ProfileAccess = {
  role?: string;
  is_admin?: boolean;
  is_super_admin?: boolean;
  permissions?: string[];
};

export async function fetchProfileAccess(): Promise<ProfileAccess | null> {
  try {
    const response = await apiFetch("/profile/access", {
      headers: authHeaders(),
    });

    if (!response.ok) return null;

    return response.json();
  } catch {
    return null;
  }
}

export function canManageMenu(access: ProfileAccess | null) {
  return Boolean(
    access?.role === "super_admin" ||
      access?.is_admin ||
      access?.permissions?.includes("menu.manage")
  );
}

export function canManageRooms(access: ProfileAccess | null) {
  return Boolean(
    access?.role === "super_admin" ||
      access?.is_super_admin ||
      access?.is_admin
  );
}
