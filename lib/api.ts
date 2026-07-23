import { API_URL } from "@/lib/config";
import { clearAuthSession } from "@/lib/auth";

export function apiUrl(path: string) {
  return `${API_URL}${path}`;
}

export async function apiFetch(path: string, init?: RequestInit) {
  const response = await fetch(apiUrl(path), init);

  if (response.status === 401 && path !== "/login") {
    handleUnauthorizedResponse();
  }

  return response;
}

function handleUnauthorizedResponse() {
  if (typeof window === "undefined") return;

  clearAuthSession();

  if (window.location.pathname !== "/login") {
    window.location.replace("/login");
  }
}
