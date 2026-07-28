# Error reference

## Horizon unavailable

Returned when the API cannot reach the configured Stellar Horizon node.

- Type: `HorizonUnavailable`
- Status: `503`
- Message: `Unable to connect to the Stellar Horizon node.`
- Suggestion: `Check your HORIZON_URL and verify the node is reachable. See https://status.stellar.org for network status.`

## Offer not found

Returned when a request references an offer ID that does not exist or is no longer available on the requested network.

- Type: `OfferNotFound`
- Status: `404`
- Message: `Offer '{offerId}' was not found on the Stellar {network} network.`
- Suggestion: `The offer may have already been filled, cancelled, or the offer ID may be incorrect.`
