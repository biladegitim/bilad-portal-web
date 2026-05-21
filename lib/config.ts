const API_PORT = "8000";
const FRONTEND_PORT = "3000";

function getRuntimeUrl(port: string) {
  if (typeof window === "undefined") return null;

  const { protocol, hostname } = window.location;
  const isLocalHost = hostname === "localhost" || hostname === "127.0.0.1";
  const isPrivateLanHost =
    hostname.startsWith("192.168.") ||
    hostname.startsWith("10.") ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname);

  if (!isLocalHost && !isPrivateLanHost) return null;

  return `${protocol}//${hostname}:${port}`;
}

export const API_URL =
  getRuntimeUrl(API_PORT) ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:8000";

export const FRONTEND_URL =
  getRuntimeUrl(FRONTEND_PORT) ||
  process.env.NEXT_PUBLIC_FRONTEND_URL ||
  "http://localhost:3000";
