const { isNativeAsset, isNonNativeAsset } = require("../src/utils/assetHelpers");

describe("isNativeAsset", () => {
  // ── Native inputs ──────────────────────────────────────────────────────────

  it("returns true for the raw string 'native'", () => {
    expect(isNativeAsset("native")).toBe(true);
  });

  it("returns true for a Horizon balance record with asset_type === 'native'", () => {
    expect(isNativeAsset({ asset_type: "native" })).toBe(true);
  });

  it("returns true for a normalised internal asset shape with type === 'native'", () => {
    expect(isNativeAsset({ type: "native" })).toBe(true);
  });

  it("returns true for an object that has both asset_type and type set to 'native'", () => {
    expect(isNativeAsset({ asset_type: "native", type: "native" })).toBe(true);
  });

  // ── Non-native inputs ──────────────────────────────────────────────────────

  it("returns false for a credit_alphanum4 Horizon record", () => {
    expect(
      isNativeAsset({
        asset_type: "credit_alphanum4",
        asset_code: "USDC",
        asset_issuer: "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN",
      }),
    ).toBe(false);
  });

  it("returns false for a credit_alphanum12 Horizon record", () => {
    expect(
      isNativeAsset({
        asset_type: "credit_alphanum12",
        asset_code: "LONGASSET12",
        asset_issuer: "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN",
      }),
    ).toBe(false);
  });

  it("returns false for a normalised asset shape with type === 'credit_alphanum4'", () => {
    expect(isNativeAsset({ type: "credit_alphanum4", code: "USDC" })).toBe(false);
  });

  it("returns false for a non-native string (e.g. asset code)", () => {
    expect(isNativeAsset("USDC")).toBe(false);
  });

  it("returns false for the string 'XLM' (which is a code, not a type)", () => {
    expect(isNativeAsset("XLM")).toBe(false);
  });

  // ── Edge cases ─────────────────────────────────────────────────────────────

  it("returns false for null", () => {
    expect(isNativeAsset(null)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(isNativeAsset(undefined)).toBe(false);
  });

  it("returns false for an empty object", () => {
    expect(isNativeAsset({})).toBe(false);
  });

  it("returns false for an empty string", () => {
    expect(isNativeAsset("")).toBe(false);
  });
});

describe("isNonNativeAsset", () => {
  it("returns false for native asset string", () => {
    expect(isNonNativeAsset("native")).toBe(false);
  });

  it("returns false for a Horizon native balance record", () => {
    expect(isNonNativeAsset({ asset_type: "native" })).toBe(false);
  });

  it("returns true for a credit_alphanum4 Horizon record", () => {
    expect(
      isNonNativeAsset({
        asset_type: "credit_alphanum4",
        asset_code: "USDC",
        asset_issuer: "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN",
      }),
    ).toBe(true);
  });

  it("returns true for a normalised non-native asset shape", () => {
    expect(isNonNativeAsset({ type: "credit_alphanum4", code: "USDC" })).toBe(true);
  });

  it("returns true for null (null is treated as non-native by isNativeAsset)", () => {
    // null is falsy → isNativeAsset returns false → isNonNativeAsset returns true
    expect(isNonNativeAsset(null)).toBe(true);
  });
});
