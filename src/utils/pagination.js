const { validateLimit, validateOrder, validateCursor } = require("./validators");

/**
 * Parse and validate pagination query parameters.
 *
 * Extracts limit, order, and cursor from query string and validates them
 * using the standard validators. This utility prevents duplication of
 * pagination logic across multiple routes.
 *
 * @param {object} query - Express req.query object
 * @param {number} [maxLimit=100] - Maximum allowed limit value
 * @returns {object} Validated pagination object with shape:
 *   {
 *     limit: number,      // Validated limit (1 to maxLimit)
 *     order: string,      // "asc" or "desc" (defaults to "desc")
 *     cursor: string|undefined  // Optional pagination cursor
 *   }
 *
 * @throws {Error} If limit or order values are invalid (validation errors have isValidation flag set)
 * @throws {Error} If cursor is provided but is not a valid non-empty string (isInvalidCursor flag set)
 *
 * @example
 * router.get("/items", (req, res) => {
 *   const { limit, order, cursor } = parsePaginationParams(req.query, 200);
 *   // Now use limit, order, cursor with Horizon API
 * });
 */
function parsePaginationParams(query = {}, maxLimit = 100) {
  // Parse limit with default of 20
  const limit = validateLimit(query.limit ?? 20, maxLimit);

  // Parse order with default of "desc"
  const order = validateOrder(query.order);

  // Extract cursor (optional, can be undefined)
  // When present, validate it is a non-empty string before forwarding to Horizon.
  let cursor;
  if (query.cursor !== undefined) {
    cursor = validateCursor(query.cursor);
  }

  return { limit, order, cursor };
}

module.exports = { parsePaginationParams };
