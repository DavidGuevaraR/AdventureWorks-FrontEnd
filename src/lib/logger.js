// src/lib/logger.js
const ENABLED = true; // ponlo en false si no quieres logs
const tag = (m) => `[AW] ${m}`;

export const log = {
  debug: (...args) => ENABLED && console.debug(tag("DEBUG:"), ...args),
  info:  (...args) => ENABLED && console.info(tag("INFO:"), ...args),
  warn:  (...args) => ENABLED && console.warn(tag("WARN:"), ...args),
  error: (...args) => ENABLED && console.error(tag("ERROR:"), ...args),
};
