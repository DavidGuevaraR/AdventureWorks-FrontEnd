// src/lib/httpClient.js
import { secureGet } from "./secureStorage";
import { log } from "./logger";

const base = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "");

async function authHeader() {
  const token = await secureGet("aw:token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(path, { method = "GET", body, signal, extraHeaders } = {}) {
  const url = `${base}/${path.replace(/^\/+/, "")}`;
  const headers = {
    "Content-Type": "application/json",
    ...(await authHeader()),
    ...(extraHeaders || {}),
  };

  log.debug("HTTP request →", { method, url, headers, body });

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    signal,
  });

  const contentType = res.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const data = isJson ? await res.json().catch(() => null) : await res.text();

  log.debug("HTTP response ←", { status: res.status, url, data });

  if (!res.ok) {
    const error = new Error("HTTP error");
    error.status = res.status;
    error.payload = data;
    throw error;
  }

  return data;
}

export const http = {
  get: (path, opts) => request(path, { method: "GET", ...(opts || {}) }),
  post: (path, body, opts) => request(path, { method: "POST", body, ...(opts || {}) }),
  put:  (path, body, opts) => request(path, { method: "PUT", body, ...(opts || {}) }),
  patch:(path, body, opts) => request(path, { method: "PATCH", body, ...(opts || {}) }),
  delete:(path, opts) => request(path, { method: "DELETE", ...(opts || {}) }),
};
