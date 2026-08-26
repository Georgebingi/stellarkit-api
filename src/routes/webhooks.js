const express = require("express");
const router = express.Router();
const webhookService = require("../services/webhookService");
const { success } = require("../utils/response");
const { validateAccountId } = require("../utils/validators");

/**
 * POST /webhooks
 * Register a webhook for an account.
 *
 * Request body:
 *   {
 *     "accountId": "G...",
 *     "url": "https://example.com/webhook",
 *     "events": ["trustline.changed"]  // optional, defaults to ["trustline.changed"]
 *   }
 */
router.post("/", (req, res, next) => {
  try {
    const { accountId, url, events } = req.body;

    if (!accountId) {
      const err = new Error("accountId is required");
      err.isValidation = true;
      err.status = 400;
      throw err;
    }

    if (!url) {
      const err = new Error("url is required");
      err.isValidation = true;
      err.status = 400;
      throw err;
    }

    validateAccountId(accountId);

    // Validate URL format
    try {
      new URL(url);
    } catch (err) {
      const validationErr = new Error("Invalid webhook URL");
      validationErr.isValidation = true;
      validationErr.status = 400;
      throw validationErr;
    }

    const webhook = webhookService.registerWebhook(accountId, url, events);
    return success(res, webhook, { statusCode: 201 });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /webhooks/:accountId
 * Get all webhooks for an account.
 */
router.get("/:accountId", (req, res, next) => {
  try {
    const { accountId } = req.params;
    validateAccountId(accountId);

    const webhooks = webhookService.getWebhooksForAccount(accountId);
    return success(res, { accountId, webhooks, count: webhooks.length });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /webhooks/:accountId/:webhookId
 * Delete a webhook.
 */
router.delete("/:accountId/:webhookId", (req, res, next) => {
  try {
    const { accountId, webhookId } = req.params;
    validateAccountId(accountId);

    const deleted = webhookService.deleteWebhook(accountId, parseInt(webhookId));
    if (!deleted) {
      const err = new Error("Webhook not found");
      err.status = 404;
      throw err;
    }

    return success(res, { deleted: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
