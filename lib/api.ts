import { API_URL } from "@/lib/config";

export function apiUrl(path: string) {
  return `${API_URL}${path}`;
}

export function apiFetch(path: string, init?: RequestInit) {
  return fetch(apiUrl(path), init);
}
