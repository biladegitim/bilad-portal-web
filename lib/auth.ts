export function getAccessToken() {
  if (typeof window === "undefined") return null;

  return localStorage.getItem("access_token");
}

export function getStoredUserRole() {
  if (typeof window === "undefined") return null;

  try {
    const user = localStorage.getItem("user");
    if (user) {
      const storedRole = JSON.parse(user)?.role;

      if (storedRole) return storedRole;
    }
  } catch {}

  try {
    const token = getAccessToken();
    if (!token) return null;

    const [, payload] = token.split(".");
    if (!payload) return null;

    const normalizedPayload = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decodedPayload = JSON.parse(window.atob(normalizedPayload));

    return decodedPayload?.role || null;
  } catch {
    return null;
  }
}

export function clearAuthSession() {
  if (typeof window === "undefined") return;

  localStorage.removeItem("access_token");
  localStorage.removeItem("user");
}

export function authHeaders(): HeadersInit {
  const token = getAccessToken();

  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function jsonAuthHeaders(): HeadersInit {
  return {
    "Content-Type": "application/json",
    ...authHeaders(),
  };
}

export function redirectIfUnauthenticated(push: (href: string) => void) {
  const token = getAccessToken();

  if (!token) {
    push("/login");
    return true;
  }

  return false;
}
