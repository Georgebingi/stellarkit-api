/**
 * Webhook management routes.
 *
 * POST /webhooks  — Register a new webhook subscription.
 * GET  /webhooks  — List all registered webhooks.
 *
 * Supported event types:
 *   - "contract.event" — fired when a Soroban contract emits an on-chain event.
 *
 * The route is mounted after the API-key middleware so all webhook management
 * operations require authentication.
 */

const express = require("express");
const router = express.Router();

const { register, list } = require("../services/webhookRegistry");

const SUPPORTED_EVENTS = new Set(["contract.event"]);

/**
 * Validate a URL string (must be http or https).
 * @param {string} url
 * @returns {boolean}
 */
function isValidUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * POST /webhooks
 *
 * Request body:
 * {
 *   "url":        "https://your-server.example.com/hook",  // required
 *   "event":      "contract.event",                        // required
 *   "contractId": "C…"                                     // optional; omit to receive events for all contracts
 * }
 */
router.post("/", (req, res) => {
  const { url, event, contractId } = req.body || {};

  if (!url || typeof url !== "string" || !isValidUrl(url)) {
    return res.status(400).json({
      success: false,
      error: {
        type: "ValidationError",
        message: "A valid http or https URL is required.",
        field: "url",
      },
    });
  }

  if (!event || typeof event !== "string" || !SUPPORTED_EVENTS.has(event)) {
    return res.status(400).json({
      success: false,
      error: {
        type: "ValidationError",
        message: `Unsupported event type. Supported events: ${[...SUPPORTED_EVENTS].join(", ")}.`,
        field: "event",
      },
    });
  }

  const entry = register({ url, event, contractId: contractId || null });

  return res.status(201).json({
    success: true,
    data: entry,
  });
});

/**
 * GET /webhooks
 *
 * Returns all registered webhook subscriptions.
 */
router.get("/", (req, res) => {
  const webhooks = list();
  return res.json({
    success: true,
    data: {
      items: webhooks,
      total: webhooks.length,
    },
  });
});

module.exports = router;
