// src/lib/secureStorage.js
import { log } from "./logger";

const enc = new TextEncoder();
const dec = new TextDecoder();

const toBase64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const fromBase64 = (b64) =>
  Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)).buffer;

function isCryptoReady() {
  const ready = typeof window !== "undefined" && window.crypto && window.crypto.subtle;
  if (!ready) log.warn("Web Crypto no disponible; se usará almacenamiento sin cifrar.");
  return !!ready;
}
function getPassphrase() {
  const p = import.meta.env.VITE_STORAGE_SECRET || "";
  if (!p) log.warn("VITE_STORAGE_SECRET no está definida; usando almacenamiento sin cifrar.");
  return p;
}

async function deriveKey(passphrase, salt) {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(passphrase),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 150000, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function secureSet(key, value) {
  try {
    const passphrase = getPassphrase();
    const data = typeof value === "string" ? value : JSON.stringify(value);

    if (!isCryptoReady() || !passphrase) {
      log.warn("secureSet fallback sin cifrar:", { key });
      localStorage.setItem(key, data);
      return;
    }

    const iv = crypto.getRandomValues(new Uint8Array(12));
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const aesKey = await deriveKey(passphrase, salt.buffer);

    const cipherBuf = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      aesKey,
      enc.encode(data)
    );

    const payload = { iv: toBase64(iv), salt: toBase64(salt), ct: toBase64(cipherBuf) };
    localStorage.setItem(key, JSON.stringify(payload));
    log.debug("secureSet OK:", { key });
  } catch (e) {
    log.error("secureSet ERROR:", e);
    // último recurso: guarda plano para no romper UX
    try {
      localStorage.setItem(key, typeof value === "string" ? value : JSON.stringify(value));
    } catch {
      /* ignore */
    }
  }
}

export async function secureGet(key) {
  try {
    const passphrase = getPassphrase();
    const raw = localStorage.getItem(key);
    if (!raw) return null;

    if (!isCryptoReady() || !passphrase) {
      log.warn("secureGet fallback sin descifrar:", { key });
      try {
        return JSON.parse(raw);
      } catch {
        return raw;
      }
    }

    const { iv, salt, ct } = JSON.parse(raw);
    if (!iv || !salt || !ct) {
      // era plano
      log.debug("secureGet detectó valor plano:", { key });
      try {
        return JSON.parse(raw);
      } catch {
        return raw;
      }
    }

    const aesKey = await deriveKey(passphrase, fromBase64(salt));
    const plainBuf = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: new Uint8Array(fromBase64(iv)) },
      aesKey,
      fromBase64(ct)
    );
    const text = dec.decode(plainBuf);
    try {
      const parsed = JSON.parse(text);
      log.debug("secureGet OK:", { key });
      return parsed;
    } catch {
      return text;
    }
  } catch (e) {
    log.error("secureGet ERROR:", e);
    // Limpia y devuelve null para evitar loops
    localStorage.removeItem(key);
    return null;
  }
}

export function secureRemove(key) {
  try {
    localStorage.removeItem(key);
    log.debug("secureRemove OK:", { key });
  } catch (e) {
    log.error("secureRemove ERROR:", e);
  }
}
