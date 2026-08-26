/**
 * In-memory metrics service.
 *
 * Tracks lightweight counters updated on every request so the /metrics
 * endpoint can report API health without an external monitoring tool.
 *
 * All counters are reset when the process restarts (in-memory only).
 *
 * Counters:
 *   totalRequests       — incremented on every incoming request
 *   totalErrors         — incremented when a response status code is >= 400
 *   totalResponseTimeMs — running sum used to compute averageResponseTimeMs
 *   cacheHits           — incremented when a response carries X-Cache: HIT
 *   cacheLookups        — incremented when a response carries X-Cache header
 *
 * Derived values (computed at read time):
 *   averageResponseTimeMs — totalResponseTimeMs / totalRequests  (0 when no requests)
 *   uptimeSeconds         — process.uptime()
 *   memoryUsageMB         — process.memoryUsage().heapUsed / 1 MiB
 *   cacheHitRate          — cacheHits / cacheLookups  (0.00 when no cache lookups)
 */

const startTime = Date.now();

const counters = {
  totalRequests: 0,
  totalErrors: 0,
  totalResponseTimeMs: 0,
  cacheHits: 0,
  cacheLookups: 0,
};

/**
 * Record the result of a completed request.
 *
 * @param {object} params
 * @param {number} params.statusCode      - HTTP status code of the response
 * @param {number} params.responseTimeMs  - Request duration in milliseconds
 * @param {string|undefined} params.xCache - Value of the X-Cache response header
 */
function record({ statusCode, responseTimeMs, xCache }) {
  counters.totalRequests += 1;
  counters.totalResponseTimeMs += responseTimeMs;

  if (statusCode >= 400) {
    counters.totalErrors += 1;
  }

  if (xCache !== undefined) {
    counters.cacheLookups += 1;
    if (xCache === "HIT") {
      counters.cacheHits += 1;
    }
  }
}

/**
 * Return a snapshot of all current metrics.
 *
 * @returns {{
 *   totalRequests: number,
 *   totalErrors: number,
 *   averageResponseTimeMs: number,
 *   uptimeSeconds: number,
 *   memoryUsageMB: number,
 *   cacheHitRate: number
 * }}
 */
function getMetrics() {
  const averageResponseTimeMs =
    counters.totalRequests > 0
      ? Math.round((counters.totalResponseTimeMs / counters.totalRequests) * 100) / 100
      : 0;

  const cacheHitRate =
    counters.cacheLookups > 0
      ? Math.round((counters.cacheHits / counters.cacheLookups) * 10000) / 10000
      : 0;

  const memoryUsageMB =
    Math.round((process.memoryUsage().heapUsed / (1024 * 1024)) * 100) / 100;

  return {
    totalRequests: counters.totalRequests,
    totalErrors: counters.totalErrors,
    averageResponseTimeMs,
    uptimeSeconds: Math.floor(process.uptime()),
    memoryUsageMB,
    cacheHitRate,
  };
}

/**
 * Reset all counters to zero.
 * Used in tests to guarantee a clean state between test cases.
 */
function reset() {
  counters.totalRequests = 0;
  counters.totalErrors = 0;
  counters.totalResponseTimeMs = 0;
  counters.cacheHits = 0;
  counters.cacheLookups = 0;
}

module.exports = { record, getMetrics, reset, counters };
