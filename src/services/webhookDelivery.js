const axios = require("axios");
const logger = require("../utils/logger");

/**
 * Webhook delivery service that handles sending webhook payloads to registered endpoints.
 * Retries failed deliveries and logs delivery attempts.
 */
class WebhookDelivery {
  constructor() {
    this.maxRetries = 3;
    this.retryDelayMs = 1000;
    this.timeoutMs = 30000;
  }

  /**
   * Trigger webhook delivery for registered webhooks.
   * @param {Array} webhooks - Array of webhook objects with 'url' property
   * @param {Object} payload - The event payload to send
   * @returns {Promise<Array>} Array of delivery results
   */
  async triggerWebhooks(webhooks, payload) {
    if (!webhooks || webhooks.length === 0) {
      return [];
    }

    const deliveryPromises = webhooks.map((webhook) => this.deliverWebhook(webhook, payload));

    return Promise.all(deliveryPromises);
  }

  /**
   * Deliver a single webhook with retry logic.
   * @param {Object} webhook - Webhook object with 'id' and 'url' properties
   * @param {Object} payload - The event payload to send
   * @returns {Promise<Object>} Delivery result object
   */
  async deliverWebhook(webhook, payload, attempt = 1) {
    try {
      const response = await axios.post(webhook.url, payload, {
        timeout: this.timeoutMs,
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "StellarKit-Webhook/1.0",
          "X-Webhook-Event": payload.event,
        },
      });

      logger.info(
        {
          webhookId: webhook.id,
          url: webhook.url,
          statusCode: response.status,
          attempt,
        },
        "Webhook delivered successfully"
      );

      return {
        webhookId: webhook.id,
        url: webhook.url,
        success: true,
        statusCode: response.status,
        attempt,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      if (attempt < this.maxRetries) {
        logger.warn(
          {
            webhookId: webhook.id,
            url: webhook.url,
            attempt,
            maxRetries: this.maxRetries,
            error: error.message,
          },
          "Webhook delivery failed, retrying..."
        );

        // Exponential backoff
        await new Promise((resolve) => setTimeout(resolve, this.retryDelayMs * attempt));

        return this.deliverWebhook(webhook, payload, attempt + 1);
      } else {
        logger.error(
          {
            webhookId: webhook.id,
            url: webhook.url,
            attempt,
            maxRetries: this.maxRetries,
            error: error.message,
          },
          "Webhook delivery failed after max retries"
        );

        return {
          webhookId: webhook.id,
          url: webhook.url,
          success: false,
          error: error.message,
          attempt,
          timestamp: new Date().toISOString(),
        };
      }
    }
  }
}

module.exports = new WebhookDelivery();
