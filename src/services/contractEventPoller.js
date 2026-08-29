/**
 * Contract event poller.
 *
 * Polls the Soroban RPC for on-chain contract events and forwards each one to
 * the webhook delivery service. The poller is deliberately thin -- it resolves
 * the raw Soroban event into a clean, serialisable payload and then delegates
 * delivery to `webhookDelivery.deliverContractEvent`.
 *
 * Usage (start once at server boot):
 *   const poller = require('./contractEventPoller');
 *   poller.start();   // begins polling
 *   poller.stop();    // cancels the interval (useful in tests)
 */

const { sorobanServer } = require("../config/stellar");
const logger = require("../utils/logger");
const { deliverContractEvent } = require("./webhookDelivery");

const POLL_INTERVAL_MS = parseInt(process.env.CONTRACT_POLL_INTERVAL_MS || "10000", 10);

let _intervalId = null;
let _lastLedger = 0;

/**
 * Decode a raw xdr.ScVal entry to a plain string/number/object, falling back
 * to the base-64 XDR representation when native conversion is unavailable.
 */
function decodeVal(scVal) {
  // Plain JS primitives (e.g. from mocked / test data) pass through as-is.
  if (scVal === null || scVal === undefined) return scVal;
  if (typeof scVal !== "object") return scVal;

  try {
    const { scValToNative } = require("@stellar/stellar-sdk");
    const native = scValToNative(scVal);
    // BigInt is not JSON-serialisable
    if (typeof native === "bigint") return native.toString();
    return native;
  } catch {
    try {
      return scVal.toXDR("base64");
    } catch {
      return null;
    }
  }
}

/**
 * Normalise a raw Soroban event object into the canonical webhook payload.
 *
 * @param {object} rawEvent  Raw event as returned by sorobanServer.getEvents()
 * @returns {object}  Normalised contract.event payload.
 */
function normaliseEvent(rawEvent) {
  const topics = (rawEvent.topic || []).map(decodeVal);
  // By Soroban convention the first topic is the event type symbol
  const eventType = topics[0] != null ? String(topics[0]) : "unknown";
  const value = rawEvent.value ? decodeVal(rawEvent.value) : null;

  return {
    event: "contract.event",
    contractId: rawEvent.contractId,
    eventType,
    topic,
    value,
    ledger: rawEvent.ledger,
  };
}

/**
 * Fetch new contract events since `_lastLedger` and deliver them.
 */
async function poll() {
  if (!sorobanServer) return;

  try {
    const startLedger = _lastLedger > 0 ? _lastLedger + 1 : undefined;
    const response = await sorobanServer.getEvents({
      startLedger,
      filters: [{ type: "contract" }],
    });

    const events = response.events || [];

    for (const rawEvent of events) {
      try {
        const payload = normaliseEvent(rawEvent);
        await deliverContractEvent(payload);

        if (rawEvent.ledger > _lastLedger) {
          _lastLedger = rawEvent.ledger;
        }
      } catch (eventErr) {
        logger.error(
          { err: eventErr.message, contractId: rawEvent.contractId },
          "[POLLER] Failed to process contract event",
        );
      }
    }
  } catch (err) {
    logger.error({ err: err.message }, "[POLLER] Contract event poll failed");
  }
}

/**
 * Start the polling interval.
 * Calling start() when already running is a no-op.
 */
function start() {
  if (_intervalId) return;
  _intervalId = setInterval(poll, POLL_INTERVAL_MS);
  logger.info(`[POLLER] Contract event polling started (interval: ${POLL_INTERVAL_MS}ms)`);
}

/**
 * Stop the polling interval.
 */
function stop() {
  if (_intervalId) {
    clearInterval(_intervalId);
    _intervalId = null;
    logger.info("[POLLER] Contract event polling stopped");
  }
}

/**
 * Get the full metadata for a Soroban contract from the Stellar RPC.
 *
 * Uses `getContractData` (with the special contract-instance key) to fetch the
 * contract's executable and deployer, and `getLedgerEntries` to obtain the
 * instance's expiration ledger and deployment ledger. The raw RPC response is
 * normalised to the StellarKit contract shape.
 *
 * @param {string} contractId  Soroban contract ID (hex string)
 * @returns {Promise<object|null>}  Normalised contract metadata, or null when
 *   the contract does not exist.
 */
async function getContractById(contractId) {
  if (!sorobanServer) {
    throw new Error("Soroban server not configured");
  }

  try {
    const { xdr } = require("@stellar/stellar-sdk");

    // The contract instance is stored under a special SCVal key.
    const instanceKey = xdr.ScVal.scvLedgerKeyContractInstance();

    // 1. Fetch the contract instance data (contains executable, deployer, etc.)
    const contractData = await sorobanServer.getContractData(contractId, instanceKey);

    // 2. Decode the instance value to a plain object.
    const instance = decodeVal(contractData.value);

    // Extract wasmHash and deployer.
    let wasmHash = null;
    if (instance && instance.executable) {
      wasmHash =
        instance.executable.wasmHash ||
        instance.executable.wasm_id ||
        instance.executable.hash ||
        null;
    }

    let deployer = null;
    if (instance && instance.deployable) {
      deployer = instance.deployable.deployed || instance.deployable.address || null;
      if (deployer && typeof deployer === "object") {
        deployer = deployer.address || deployer.account || null;
      }
      if (deployer && typeof deployer !== "string") {
        deployer = decodeVal(deployer);
      }
    }

    if (!wasmHash) {
      throw new Error("Unable to determine wasm hash from contract instance");
    }

    // 3. Build ledger keys for the instance and the code entry.
    const contractAddress = xdr.ScAddress.scAddressTypeContract(
      xdr.Hash.fromString(contractId),
    );

    const instanceLedgerKey = xdr.LedgerKey.contractData(
      new xdr.LedgerKeyContractData({
        contract: contractAddress,
        key: instanceKey,
      }),
    );

    const codeLedgerKey = xdr.LedgerKey.contractCode(
      xdr.Hash.fromString(wasmHash),
    );

    // 4. Fetch the ledger entries to get expiration and deployment info.
    const ledgerEntries = await sorobanServer.getLedgerEntries([
      instanceLedgerKey,
      codeLedgerKey,
    ]);

    const entries = ledgerEntries.entries || [];

    let expiryLedger = null;
    for (const entry of entries) {
      if (entry.liveUntilLedgerSeq) {
        expiryLedger = entry.liveUntilLedgerSeq;
        break;
      }
      if (entry.expirationLedgerSeq) {
        expiryLedger = entry.expirationLedgerSeq;
        break;
      }
    }
    if (expiryLedger == null) {
      expiryLedger =
        contractData.expirationLedgerSeq ||
        contractData.liveUntilLedgerSeq ||
        null;
    }

    const deployedLedger = contractData.lastModifiedLedgerSeq || null;

    // 5. Convert the deployment ledger to a timestamp.
    let deployedAt = null;
    if (deployedLedger != null) {
      try {
        const ledger = await sorobanServer.getLedger(deployedLedger);
        if (ledger && ledger.header) {
          const header = xdr.LedgerHeader.fromXDR(ledger.header, "base64");
          const timestamp = header.scpValue.closeTime;
          deployedAt = new Date(Number(timestamp) * 1000).toISOString();
        }
      } catch (err) {
        // If ledger lookup fails we leave deployedAt null.
        logger.warn({ err: err.message, deployedLedger }, "[POLLER] Failed to resolve deployment ledger time");
      }
    }

    // 6. Determine the current ledger for isExpired.
    const latestLedger = await sorobanServer.getLatestLedger();
    const currentLedger =
      typeof latestLedger === "number"
        ? latestLedger
        : (latestLedger && latestLedger.sequence) || null;

    const isExpired =
      currentLedger != null && expiryLedger != null
        ? currentLedger > expiryLedger
        : false;

    return {
      contractId,
      wasmHash,
      deployer,
      deployedLedger,
      deployedAt,
      isExpired,
      expiryLedger,
    };
  } catch (err) {
    // RPC throws 404 when the contract does not exist.
    if (err && err.response && err.response.status === 404) {
      return null;
    }
    throw err;
  }
}

module.exports = { start, stop, poll, normaliseEvent, getContractById };
