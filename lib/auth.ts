export function getAccessToken() {
  if (typeof window === "undefined") return null;

  return localStorage.getItem("access_token");
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
