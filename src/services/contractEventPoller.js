"use strict";

/**
 * Contract Event Poller
 *
 * Periodically polls the Stellar Soroban RPC for new events emitted by
 * registered contracts. For each contract, it compares the latest event ID
 * against the last seen event ID and triggers webhook delivery for any newer
 * events found.
 *
 * Configuration (environment variables):
 *   CONTRACT_POLL_INTERVAL_MS — polling interval in milliseconds (default: 5000)
 *
 * Usage:
 *   const poller = require("./contractEventPoller");
 *   poller.start();   // begin polling
 *   poller.stop();    // stop polling
 *   poller.register("C...", webhookDeliveryFn);  // add a contract to watch
 */

const logger = require("../utils/logger");

/** Default poll interval — 5 seconds, configurable via env. */
const DEFAULT_POLL_INTERVAL_MS = 5000;

/**
 * Parse and validate the CONTRACT_POLL_INTERVAL_MS environment variable.
 * Falls back to DEFAULT_POLL_INTERVAL_MS when the value is absent or invalid.
 *
 * @returns {number} Poll interval in milliseconds.
 */
function getPollIntervalMs() {
  const raw = process.env.CONTRACT_POLL_INTERVAL_MS;
  if (raw === undefined || raw === null || raw === "") {
    return DEFAULT_POLL_INTERVAL_MS;
  }
  const parsed = parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_POLL_INTERVAL_MS;
}

/**
 * Compare two Soroban event IDs.
 *
 * Event IDs are lexicographically comparable strings of the form
 * "<ledger_sequence>-<event_index>" (e.g. "1234567-1").  A simple string
 * comparison is sufficient because both segments are zero-padded to the same
 * width by the Soroban RPC.  When the format is unknown we fall back to a
 * numeric comparison of the raw string values.
 *
 * @param {string} a
 * @param {string} b
 * @returns {number} Negative if a < b, positive if a > b, 0 if equal.
 */
function compareEventIds(a, b) {
  if (a === b) return 0;
  // Attempt ledger-sequence / event-index comparison
  const [aLedger, aIdx] = String(a).split("-").map(Number);
  const [bLedger, bIdx] = String(b).split("-").map(Number);
  if (Number.isFinite(aLedger) && Number.isFinite(bLedger)) {
    if (aLedger !== bLedger) return aLedger - bLedger;
    return (aIdx || 0) - (bIdx || 0);
  }
  // Fallback: lexicographic
  return String(a) < String(b) ? -1 : 1;
}

/**
 * @typedef {Object} ContractWatcher
 * @property {string} contractId - Soroban contract address (C...)
 * @property {string|null} lastSeenEventId - Most recently processed event ID
 * @property {(contractId: string, event: object) => Promise<void>} deliverWebhook
 *   Callback invoked for each new event. Receives the contract ID and the raw
 *   event object from the RPC response.
 */

/**
 * ContractEventPoller manages a registry of watched contracts and drives
 * the periodic poll-and-deliver loop.
 *
 * The class is designed to be used as a singleton (exported instance) so that
 * the watcher registry persists for the lifetime of the process.
 */
class ContractEventPoller {
  constructor() {
    /** @type {Map<string, ContractWatcher>} */
    this._watchers = new Map();

    /** @type {ReturnType<typeof setInterval>|null} */
    this._timer = null;

    /**
     * Injectable RPC client — defaults to the shared sorobanServer from
     * stellar config. Tests replace this with a mock.
     *
     * @type {{ getEvents: (opts: object) => Promise<object> } | null}
     */
    this._rpcClient = null;
  }

  /**
   * Register a contract for event watching.
   *
   * If the contract is already registered its deliverWebhook callback is
   * updated but the lastSeenEventId is preserved so no events are re-delivered.
   *
   * @param {string} contractId - Soroban contract address (C...)
   * @param {(contractId: string, event: object) => Promise<void>} deliverWebhook
   * @param {string|null} [initialLastSeenEventId=null] - Resume from a known
   *   event ID. Pass null to deliver all events from the next poll onwards.
   */
  register(contractId, deliverWebhook, initialLastSeenEventId = null) {
    if (!contractId || typeof contractId !== "string") {
      throw new TypeError("contractId must be a non-empty string");
    }
    if (typeof deliverWebhook !== "function") {
      throw new TypeError("deliverWebhook must be a function");
    }

    const existing = this._watchers.get(contractId);
    this._watchers.set(contractId, {
      contractId,
      lastSeenEventId: existing ? existing.lastSeenEventId : initialLastSeenEventId,
      deliverWebhook,
    });
  }

  /**
   * Deregister a contract. No further events will be delivered for it.
   *
   * @param {string} contractId
   */
  deregister(contractId) {
    this._watchers.delete(contractId);
  }

  /**
   * Start the polling loop. Calling start() on an already-running poller is
   * a no-op.
   *
   * @param {number} [intervalMs] - Override poll interval (useful in tests).
   */
  start(intervalMs) {
    if (this._timer !== null) return;
    const interval = intervalMs !== undefined ? intervalMs : getPollIntervalMs();
    this._timer = setInterval(() => this._poll(), interval);
    // Allow the process to exit even when the timer is active
    if (this._timer.unref) this._timer.unref();
    logger.info(`[ContractEventPoller] started, interval=${interval}ms`);
  }

  /**
   * Stop the polling loop. The current in-flight poll (if any) completes
   * normally; no new polls are scheduled after stop() returns.
   */
  stop() {
    if (this._timer === null) return;
    clearInterval(this._timer);
    this._timer = null;
    logger.info("[ContractEventPoller] stopped");
  }

  /** @returns {boolean} Whether the poller is currently running. */
  get isRunning() {
    return this._timer !== null;
  }

  /**
   * Return the RPC client, resolving lazily from the stellar config so that
   * tests can override `this._rpcClient` before the first poll.
   *
   * @private
   * @returns {{ getEvents: (opts: object) => Promise<object> }}
   * @throws {Error} When no Soroban RPC is configured.
   */
  _getClient() {
    if (this._rpcClient) return this._rpcClient;
    // Lazy-require to avoid circular dependencies and allow test overrides
    const { sorobanServer } = require("../config/stellar");
    if (!sorobanServer) {
      throw new Error(
        "Soroban RPC is not configured. Set SOROBAN_RPC_URL to use contract event polling."
      );
    }
    return sorobanServer;
  }

  /**
   * Execute one poll cycle across all registered contracts.
   *
   * Errors from individual contract polls are caught and logged so that one
   * misbehaving contract cannot stall the entire poller.
   *
   * @private
   */
  async _poll() {
    if (this._watchers.size === 0) return;

    const pollPromises = [];
    for (const watcher of this._watchers.values()) {
      pollPromises.push(this._pollContract(watcher));
    }

    const results = await Promise.allSettled(pollPromises);
    for (const result of results) {
      if (result.status === "rejected") {
        logger.error(
          { err: result.reason },
          "[ContractEventPoller] poll error: " + (result.reason && result.reason.message)
        );
      }
    }
  }

  /**
   * Poll a single contract for new events and deliver any that are newer than
   * the watcher's lastSeenEventId.
   *
   * @private
   * @param {ContractWatcher} watcher
   */
  async _pollContract(watcher) {
    const client = this._getClient();

    /** @type {{ events: Array<{id: string, [key: string]: any}> }} */
    const response = await client.getEvents({
      filters: [
        {
          type: "contract",
          contractIds: [watcher.contractId],
        },
      ],
    });

    const events = (response && response.events) ? response.events : [];
    if (events.length === 0) return;

    // Deliver only events newer than the last seen event ID, in ascending order
    const newEvents = events
      .filter((evt) => {
        if (!watcher.lastSeenEventId) return true;
        return compareEventIds(evt.id, watcher.lastSeenEventId) > 0;
      })
      .sort((a, b) => compareEventIds(a.id, b.id));

    if (newEvents.length === 0) return;

    for (const evt of newEvents) {
      try {
        await watcher.deliverWebhook(watcher.contractId, evt);
        // Advance the cursor only after successful delivery
        watcher.lastSeenEventId = evt.id;
      } catch (deliveryErr) {
        logger.error(
          { err: deliveryErr, contractId: watcher.contractId, eventId: evt.id },
          "[ContractEventPoller] webhook delivery failed"
        );
        // Stop processing further events for this contract this cycle so order
        // is preserved and nothing is skipped silently
        break;
      }
    }
  }
}

// Export a singleton instance so all callers share the same registry
const poller = new ContractEventPoller();

module.exports = poller;
module.exports.ContractEventPoller = ContractEventPoller;
module.exports.compareEventIds = compareEventIds;
module.exports.getPollIntervalMs = getPollIntervalMs;
