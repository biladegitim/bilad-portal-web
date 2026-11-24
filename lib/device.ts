// Keep the original browser identity across the production domain migration.
// Never derive this from the account or fetch another user's device ID.
export const LEGACY_ORIGIN = "https://bilad-portal-web.vercel.app";
export const PORTAL_ORIGIN = "https://portal.bilad.org.tr";
const ATTEMPT_KEY = "device_migration_v1";
const PENDING_KEY = "device_migration_pending";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function getOrCreateDeviceId() {
  let id = localStorage.getItem("device_id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("device_id", id);
  }
  return id;
}

export function isDeviceBindingError(status: number, detail: unknown) {
  return status === 403 && typeof detail === "string" &&
    /cihaz/i.test(detail) && /tanımlı/.test(detail);
}

export const DEVICE_HELP = "Cihaz eşleşmesi doğrulanamadı. Eski adresi kullandığınız aynı tarayıcıdan tekrar deneyin. Devam ederse yöneticinizden Kullanıcılar bölümünde cihaz eşleşmenizi sıfırlamasını isteyin.";

export function beginDeviceMigration(force = false) {
  if (window.location.origin !== PORTAL_ORIGIN) return false;
  try {
    if (!force && localStorage.getItem(ATTEMPT_KEY)) return false;
    const state = crypto.randomUUID();
    sessionStorage.setItem(PENDING_KEY, JSON.stringify({ state, createdAt: Date.now() }));
    // Mark before leaving so a cancelled/blocked transfer cannot cause a loop.
    localStorage.setItem(ATTEMPT_KEY, "started");
    window.location.replace(`${LEGACY_ORIGIN}/device-transfer#state=${state}`);
    return true;
  } catch {
    return false;
  }
}

export function completeDeviceMigration(): string {
  const origin = window.location.origin;
  if (origin !== LEGACY_ORIGIN && origin !== PORTAL_ORIGIN) {
    return "Cihaz aktarımı yalnızca resmi portal adreslerinde yapılabilir.";
  }
  const params = new URLSearchParams(window.location.hash.slice(1));
  // Device identifiers stay in the fragment (never sent in HTTP requests).
  // Remove them from the current history entry before rendering anything else.
  window.history.replaceState(null, "", "/device-transfer");
  const state = params.get("state") || "";
  if (!state && origin === PORTAL_ORIGIN) {
    return "Eski adreste kullandığınız aynı tarayıcıdaysanız aktarımı başlatın. Hesabınızın mevcut cihaz eşleşmesi korunacaktır.";
  }
  if (!UUID.test(state)) return "Aktarım bağlantısı geçersiz. Yeni adresten tekrar başlatın.";

  if (origin === LEGACY_ORIGIN) {
    const id = localStorage.getItem("device_id");
    const result = new URLSearchParams({ state });
    if (id && UUID.test(id)) result.set("device_id", id);
    else result.set("missing", "1");
    // The destination is fixed: never accept a return URL from the caller.
    window.location.replace(`${PORTAL_ORIGIN}/device-transfer#${result}`);
    return "Cihaz kaydı yeni adrese aktarılıyor…";
  }

  const raw = sessionStorage.getItem(PENDING_KEY);
  if (!raw) return "Aktarım oturumu bulunamadı. Aynı tarayıcıdan yeniden deneyin.";
  const pending = JSON.parse(raw) as { state: string; createdAt: number };
  if (pending.state !== state || !Number.isFinite(pending.createdAt) ||
      Date.now() - pending.createdAt > 10 * 60 * 1000 || pending.createdAt > Date.now()) {
    return "Aktarım oturumu geçersiz veya süresi dolmuş. Yeniden deneyin.";
  }
  sessionStorage.removeItem(PENDING_KEY);
  const id = params.get("device_id");
  if (!id || !UUID.test(id)) {
    localStorage.setItem(ATTEMPT_KEY, "missing");
    return `Eski adreste bu tarayıcıya ait cihaz kaydı bulunamadı. ${DEVICE_HELP}`;
  }
  const currentId = localStorage.getItem("device_id");
  if (currentId && currentId !== id) {
    localStorage.setItem("device_id_before_migration", currentId);
  }
  localStorage.setItem("device_id", id);
  localStorage.setItem(ATTEMPT_KEY, "transferred");
  // Do not replay a scan: its QR token may have expired during navigation.
  return "Cihaz kaydınız aktarıldı. QR Okut düğmesine basıp güncel QR kodu yeniden okutun.";
}
