import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { beginDeviceMigration, completeDeviceMigration, getOrCreateDeviceId, isDeviceBindingError, LEGACY_ORIGIN, PORTAL_ORIGIN } from "../lib/device.ts";

const storage = () => {
  const values = new Map();
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
};
let target;
function location(origin, hash = "") {
  globalThis.window = {
    location: { origin, hash, replace: url => { target = new URL(url); } },
    history: { replaceState: () => { window.location.hash = ""; } },
  };
}
beforeEach(() => {
  globalThis.localStorage = storage();
  globalThis.sessionStorage = storage();
  target = null;
  location(PORTAL_ORIGIN);
});

test("same-browser identity survives the old/new origin round trip", () => {
  const oldId = randomUUID();
  const newId = getOrCreateDeviceId();
  const newStorage = localStorage;
  assert.equal(beginDeviceMigration(), true);
  assert.equal(target.origin, LEGACY_ORIGIN);
  assert.equal(target.search, "");
  globalThis.localStorage = storage();
  localStorage.setItem("device_id", oldId);
  location(LEGACY_ORIGIN, target.hash);
  completeDeviceMigration();
  assert.equal(target.origin, PORTAL_ORIGIN);
  assert.equal(target.search, "");
  globalThis.localStorage = newStorage;
  location(PORTAL_ORIGIN, target.hash);
  assert.match(completeDeviceMigration(), /aktarıldı/);
  assert.equal(getOrCreateDeviceId(), oldId);
  assert.equal(localStorage.getItem("device_id_before_migration"), newId);
  assert.equal(sessionStorage.getItem("device_migration_pending"), null);
  assert.equal(window.location.hash, "");
  assert.equal(beginDeviceMigration(), false);
});

test("missing old storage preserves new identity and does not loop", () => {
  const id = getOrCreateDeviceId();
  const newStorage = localStorage;
  beginDeviceMigration();
  globalThis.localStorage = storage();
  location(LEGACY_ORIGIN, target.hash);
  completeDeviceMigration();
  globalThis.localStorage = newStorage;
  location(PORTAL_ORIGIN, target.hash);
  assert.match(completeDeviceMigration(), /bulunamadı/);
  assert.equal(getOrCreateDeviceId(), id);
  assert.equal(beginDeviceMigration(), false);
});

test("unsolicited and wrong-state transfers cannot replace device identity", () => {
  const id = getOrCreateDeviceId();
  const hash = `#state=${randomUUID()}&device_id=${randomUUID()}`;
  location(PORTAL_ORIGIN, hash);
  assert.match(completeDeviceMigration(), /bulunamadı/);
  beginDeviceMigration();
  location(PORTAL_ORIGIN, hash);
  assert.match(completeDeviceMigration(), /geçersiz/);
  assert.equal(getOrCreateDeviceId(), id);
});

test("expired state cannot replace device identity", () => {
  const id = getOrCreateDeviceId();
  beginDeviceMigration();
  const pending = JSON.parse(sessionStorage.getItem("device_migration_pending"));
  pending.createdAt -= 11 * 60 * 1000;
  sessionStorage.setItem("device_migration_pending", JSON.stringify(pending));
  location(PORTAL_ORIGIN, `#state=${pending.state}&device_id=${randomUUID()}`);
  assert.match(completeDeviceMigration(), /süresi dolmuş/);
  assert.equal(getOrCreateDeviceId(), id);
});

test("external origins cannot start or receive a transfer", () => {
  location("https://example.com", `#state=${randomUUID()}&device_id=${randomUUID()}`);
  assert.equal(beginDeviceMigration(true), false);
  assert.match(completeDeviceMigration(), /resmi portal/);
  assert.equal(target, null);
});

test("legacy transfer destination cannot be overridden", () => {
  location(LEGACY_ORIGIN, `#state=${randomUUID()}&returnUrl=https://example.com`);
  localStorage.setItem("device_id", randomUUID());
  completeDeviceMigration();
  assert.equal(target.origin, PORTAL_ORIGIN);
});

test("only device binding 403s trigger migration, not auth or expired QR errors", () => {
  assert.equal(isDeviceBindingError(403, "Bu hesap farklı bir cihaza tanımlı"), true);
  assert.equal(isDeviceBindingError(401, "Bu hesap farklı bir cihaza tanımlı"), false);
  assert.equal(isDeviceBindingError(403, "Yetkiniz yok"), false);
  assert.equal(isDeviceBindingError(400, "QR kodun süresi dolmuş"), false);
});

test("blocked storage fails without navigation", () => {
  globalThis.sessionStorage = { setItem: () => { throw Error("blocked"); } };
  assert.equal(beginDeviceMigration(), false);
  assert.equal(target, null);
});
