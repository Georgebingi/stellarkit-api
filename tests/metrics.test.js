/**
 * Tests for GET /metrics endpoint and the underlying metrics service.
 *
 * Verifies:
 *   - Correct response shape
 *   - Counters increment on every request
 *   - Error counter increments on 4xx/5xx responses
 *   - Cache hit rate is computed from X-Cache headers
 *   - Endpoint is reachable (excluded from rate limiting)
 *   - averageResponseTimeMs is derived correctly
 */

const request = require("supertest");
const metricsService = require("../src/services/metrics");

// Reset counters before each test so tests are independent
beforeEach(() => {
  metricsService.reset();
});

afterEach(() => {
  metricsService.reset();
});

// ── Unit tests for the metrics service ──────────────────────────────────────

describe("metricsService", () => {
  it("starts with all counters at zero", () => {
    const m = metricsService.getMetrics();
    expect(m.totalRequests).toBe(0);
    expect(m.totalErrors).toBe(0);
    expect(m.averageResponseTimeMs).toBe(0);
    expect(m.cacheHitRate).toBe(0);
  });

  it("increments totalRequests on every record() call", () => {
    metricsService.record({ statusCode: 200, responseTimeMs: 10 });
    metricsService.record({ statusCode: 200, responseTimeMs: 20 });
    expect(metricsService.getMetrics().totalRequests).toBe(2);
  });

  it("increments totalErrors for status codes >= 400", () => {
    metricsService.record({ statusCode: 200, responseTimeMs: 5 });
    metricsService.record({ statusCode: 404, responseTimeMs: 5 });
    metricsService.record({ statusCode: 500, responseTimeMs: 5 });
    metricsService.record({ statusCode: 429, responseTimeMs: 5 });
    const m = metricsService.getMetrics();
    expect(m.totalErrors).toBe(3);
    expect(m.totalRequests).toBe(4);
  });

  it("does not increment totalErrors for 2xx or 3xx responses", () => {
    metricsService.record({ statusCode: 200, responseTimeMs: 5 });
    metricsService.record({ statusCode: 201, responseTimeMs: 5 });
    metricsService.record({ statusCode: 304, responseTimeMs: 5 });
    expect(metricsService.getMetrics().totalErrors).toBe(0);
  });

  it("computes averageResponseTimeMs correctly", () => {
    metricsService.record({ statusCode: 200, responseTimeMs: 100 });
    metricsService.record({ statusCode: 200, responseTimeMs: 200 });
    metricsService.record({ statusCode: 200, responseTimeMs: 300 });
    // (100 + 200 + 300) / 3 = 200
    expect(metricsService.getMetrics().averageResponseTimeMs).toBe(200);
  });

  it("returns averageResponseTimeMs of 0 when there are no requests", () => {
    expect(metricsService.getMetrics().averageResponseTimeMs).toBe(0);
  });

  it("tracks cache hits when X-Cache: HIT is provided", () => {
    metricsService.record({ statusCode: 200, responseTimeMs: 5, xCache: "HIT" });
    metricsService.record({ statusCode: 200, responseTimeMs: 5, xCache: "MISS" });
    metricsService.record({ statusCode: 200, responseTimeMs: 5, xCache: "HIT" });
    const m = metricsService.getMetrics();
    // 2 hits out of 3 cache-aware requests
    expect(m.cacheHitRate).toBeCloseTo(2 / 3, 3);
  });

  it("ignores requests without an X-Cache header in the cache hit rate", () => {
    metricsService.record({ statusCode: 200, responseTimeMs: 5 }); // no xCache
    metricsService.record({ statusCode: 200, responseTimeMs: 5, xCache: "HIT" });
    const m = metricsService.getMetrics();
    // Only 1 cache lookup (the one with xCache), and it was a HIT → 100%
    expect(m.cacheHitRate).toBe(1);
  });

  it("returns cacheHitRate of 0 when there are no cache lookups", () => {
    metricsService.record({ statusCode: 200, responseTimeMs: 5 });
    expect(metricsService.getMetrics().cacheHitRate).toBe(0);
  });

  it("returns uptimeSeconds as a non-negative integer", () => {
    const m = metricsService.getMetrics();
    expect(typeof m.uptimeSeconds).toBe("number");
    expect(m.uptimeSeconds).toBeGreaterThanOrEqual(0);
    expect(Number.isInteger(m.uptimeSeconds)).toBe(true);
  });

  it("returns memoryUsageMB as a positive number", () => {
    const m = metricsService.getMetrics();
    expect(typeof m.memoryUsageMB).toBe("number");
    expect(m.memoryUsageMB).toBeGreaterThan(0);
  });

  it("reset() zeros all counters", () => {
    metricsService.record({ statusCode: 200, responseTimeMs: 100, xCache: "HIT" });
    metricsService.record({ statusCode: 500, responseTimeMs: 50 });
    metricsService.reset();
    const m = metricsService.getMetrics();
    expect(m.totalRequests).toBe(0);
    expect(m.totalErrors).toBe(0);
    expect(m.averageResponseTimeMs).toBe(0);
    expect(m.cacheHitRate).toBe(0);
  });
});

// ── HTTP integration tests for GET /metrics ──────────────────────────────────

describe("GET /metrics", () => {
  // Require app after resetting so the startup requests don't pollute counts
  let app;
  beforeAll(() => {
    app = require("../src/index");
  });

  it("returns 200 with success: true", async () => {
    const res = await request(app).get("/metrics");
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("returns the expected shape", async () => {
    const res = await request(app).get("/metrics");
    const { data } = res.body;

    expect(data).toHaveProperty("totalRequests");
    expect(data).toHaveProperty("totalErrors");
    expect(data).toHaveProperty("averageResponseTimeMs");
    expect(data).toHaveProperty("uptimeSeconds");
    expect(data).toHaveProperty("memoryUsageMB");
    expect(data).toHaveProperty("cacheHitRate");
  });

  it("all fields are numbers", async () => {
    const res = await request(app).get("/metrics");
    const { data } = res.body;

    expect(typeof data.totalRequests).toBe("number");
    expect(typeof data.totalErrors).toBe("number");
    expect(typeof data.averageResponseTimeMs).toBe("number");
    expect(typeof data.uptimeSeconds).toBe("number");
    expect(typeof data.memoryUsageMB).toBe("number");
    expect(typeof data.cacheHitRate).toBe("number");
  });

  it("totalRequests increments after each request", async () => {
    metricsService.reset();
    const before = metricsService.getMetrics().totalRequests;

    await request(app).get("/metrics");
    await request(app).get("/metrics");

    const after = metricsService.getMetrics().totalRequests;
    expect(after).toBeGreaterThan(before);
  });

  it("totalErrors increments when a route returns an error", async () => {
    metricsService.reset();
    // Hit a known 404 route
    await request(app).get("/this-route-does-not-exist-xyz");

    const m = metricsService.getMetrics();
    expect(m.totalErrors).toBeGreaterThanOrEqual(1);
  });

  it("uptimeSeconds is a non-negative integer", async () => {
    const res = await request(app).get("/metrics");
    const { uptimeSeconds } = res.body.data;
    expect(uptimeSeconds).toBeGreaterThanOrEqual(0);
    expect(Number.isInteger(uptimeSeconds)).toBe(true);
  });

  it("memoryUsageMB is a positive number", async () => {
    const res = await request(app).get("/metrics");
    expect(res.body.data.memoryUsageMB).toBeGreaterThan(0);
  });

  it("cacheHitRate is between 0 and 1 inclusive", async () => {
    const res = await request(app).get("/metrics");
    const { cacheHitRate } = res.body.data;
    expect(cacheHitRate).toBeGreaterThanOrEqual(0);
    expect(cacheHitRate).toBeLessThanOrEqual(1);
  });
});
