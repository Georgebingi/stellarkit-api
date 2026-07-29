/**
 * Request logging middleware.
 *
 * Logs a single structured entry for every completed request via the shared
 * Pino logger. Each entry includes the HTTP method, path, status code, request
 * ID, and the elapsed response time in milliseconds, giving consistent
 * visibility into how long individual requests take across all routes.
 */

const logger = require("../utils/logger");

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
  });

  next();
}

module.exports = requestLogger;
