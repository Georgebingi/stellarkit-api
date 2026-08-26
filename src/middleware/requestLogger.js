/**
 * Request logging middleware.
 *
 * Logs a single structured entry for every completed request via the shared
 * Pino logger. Each entry includes the HTTP method, path, status code, request
 * ID, and the elapsed response time in milliseconds, giving consistent
 * visibility into how long individual requests take across all routes.
 *
 * Slow request detection:
 *   When a request exceeds SLOW_REQUEST_THRESHOLD_MS (default: 2000 ms) a
 *   [SLOW REQUEST] warning is emitted with the route, method, duration, and
 *   request ID so operators can identify performance hotspots without external
 *   tooling.  The threshold is configurable via environment variable.
 */

const logger = require("../utils/logger");

const SLOW_REQUEST_THRESHOLD_MS =
  parseInt(process.env.SLOW_REQUEST_THRESHOLD_MS, 10) || 2000;

function requestLogger(req, res, next) {
  const start = process.hrtime.bigint();

  res.on("finish", () => {
    const elapsedMs = Number(process.hrtime.bigint() - start) / 1e6;
    // Keep sub-millisecond precision while avoiding noisy floating point tails.
    const responseTimeMs = Math.round(elapsedMs * 1000) / 1000;

    const requestId = req.requestId || "-";
    const method = req.method;
    const path = req.originalUrl || req.url;
    const statusCode = res.statusCode;

    logger.info(
      { requestId, method, path, statusCode, responseTimeMs },
      `[${requestId}] ${method} ${path} ${statusCode} ${responseTimeMs}ms`,
    );

    // Slow request detection — warn when response time exceeds the threshold.
    if (responseTimeMs > SLOW_REQUEST_THRESHOLD_MS) {
      logger.warn(
        { requestId, method, path, durationMs: responseTimeMs, threshold: SLOW_REQUEST_THRESHOLD_MS },
        `[SLOW REQUEST] ${method} ${path} took ${responseTimeMs}ms (threshold: ${SLOW_REQUEST_THRESHOLD_MS}ms) requestId=${requestId}`,
      );
    }
  });

  next();
}

module.exports = requestLogger;
module.exports.SLOW_REQUEST_THRESHOLD_MS = SLOW_REQUEST_THRESHOLD_MS;
