const express = require("express");

// ── Constants ─────────────────────────────────────────────────────────────────

const DEFAULT_MAX_KB = 10;

/**
 * Resolve the maximum allowed request body size in kilobytes.
 *
 * Priority:
 *   1. MAX_BODY_SIZE_KB  — numeric KB value (e.g. "10")
 *   2. MAX_BODY_SIZE     — legacy size string  (e.g. "10kb", "1mb")
 *   3. Hard default      — 10 KB
 *
 * @returns {{ kb: number, expressLimit: string }}
 */
function resolveLimit() {
  // MAX_BODY_SIZE_KB takes priority — plain kilobyte number
  const kbEnv = process.env.MAX_BODY_SIZE_KB;
  if (kbEnv !== undefined && kbEnv !== "") {
    const parsed = parseFloat(kbEnv);
    if (!isNaN(parsed) && parsed > 0) {
      return { kb: parsed, expressLimit: `${parsed}kb` };
    }
  }

  // Legacy MAX_BODY_SIZE string — parse unit to derive KB equivalent
  const legacyEnv = process.env.MAX_BODY_SIZE;
  if (legacyEnv !== undefined && legacyEnv !== "") {
    const normalized = String(legacyEnv).trim().toLowerCase();
    const mbMatch = normalized.match(/^([0-9]*\.?[0-9]+)mb$/);
    if (mbMatch) {
      const kb = parseFloat(mbMatch[1]) * 1024;
      return { kb, expressLimit: normalized };
    }
    const kbMatch = normalized.match(/^([0-9]*\.?[0-9]+)kb$/);
    if (kbMatch) {
      return { kb: parseFloat(kbMatch[1]), expressLimit: normalized };
    }
    const bMatch = normalized.match(/^([0-9]+)b?$/);
    if (bMatch) {
      const kb = parseInt(bMatch[1], 10) / 1024;
      return { kb, expressLimit: `${bMatch[1]}b` };
    }
  }

  return { kb: DEFAULT_MAX_KB, expressLimit: `${DEFAULT_MAX_KB}kb` };
}

const { kb: MAX_KB, expressLimit: EXPRESS_LIMIT } = resolveLimit();

// ── Middleware ────────────────────────────────────────────────────────────────

/**
 * Express json() body parser pre-configured with the resolved size cap.
 * When a request body exceeds the limit, Express emits an error with
 * type === "entity.too.large" which is caught here before reaching any
 * route handler.
 */
const jsonParser = express.json({ limit: EXPRESS_LIMIT });

/**
 * Composed middleware that:
 *   1. Parses the JSON body with the configured size cap.
 *   2. Intercepts the "entity.too.large" error and converts it to a clean
 *      413 response with the standardised StellarKit error envelope so
 *      clients receive a consistent shape regardless of where the error
 *      originates.
 *
 * Acceptance criteria shape:
 *   {
 *     success: false,
 *     error: {
 *       type: "PayloadTooLarge",
 *       message: "Request body exceeds the maximum allowed size of 10KB."
 *     }
 *   }
 *
 * @param {import("express").Request}  req
 * @param {import("express").Response} res
 * @param {import("express").NextFunction} next
 */
function bodySizeLimit(req, res, next) {
  jsonParser(req, res, (err) => {
    if (!err) {
      return next();
    }

    // Payload-too-large is signalled by Express with type "entity.too.large"
    // or a status / statusCode of 413.
    if (err.type === "entity.too.large" || err.status === 413 || err.statusCode === 413) {
      return res.status(413).json({
        success: false,
        error: {
          type: "PayloadTooLarge",
          message: `Request body exceeds the maximum allowed size of ${MAX_KB}KB.`,
        },
      });
    }

    // Any other body-parser error (malformed JSON, charset errors, etc.)
    // is forwarded to the global error handler.
    next(err);
  });
}

// ── Exports ───────────────────────────────────────────────────────────────────

module.exports = bodySizeLimit;

/**
 * The resolved Express-compatible limit string (e.g. "10kb").
 * Exported so tests can assert the correct value is in use.
 */
module.exports.MAX_BODY_SIZE = EXPRESS_LIMIT;

/**
 * The resolved limit in kilobytes as a number.
 * Exported for use in error messages and tests.
 */
module.exports.MAX_BODY_SIZE_KB = MAX_KB;
