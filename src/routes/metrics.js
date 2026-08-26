/**
 * GET /metrics
 *
 * Returns a snapshot of in-memory API performance counters suitable for
 * operator dashboards and health checks.  All counters are reset when the
 * process restarts.
 *
 * This endpoint is intentionally excluded from the global rate limiter so
 * monitoring systems can poll it frequently without consuming request quota.
 *
 * Response shape:
 *   {
 *     success: true,
 *     data: {
 *       totalRequests:        <number>  — all requests handled since startup
 *       totalErrors:          <number>  — responses with status >= 400
 *       averageResponseTimeMs:<number>  — mean duration across all requests
 *       uptimeSeconds:        <number>  — process uptime in whole seconds
 *       memoryUsageMB:        <number>  — current heap usage in MiB
 *       cacheHitRate:         <number>  — fraction of cache-aware requests that hit (0–1)
 *     }
 *   }
 *
 * @example
 * GET /metrics
 */

const express = require("express");
const router = express.Router();
const metricsService = require("../services/metrics");
const { success } = require("../utils/response");

router.get("/", (req, res) => {
  return success(res, metricsService.getMetrics());
});

module.exports = router;
