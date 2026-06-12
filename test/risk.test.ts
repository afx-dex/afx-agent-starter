import { describe, expect, it } from "vitest";
import { evaluateRisk } from "../src/risk.js";
import type { AgentConfig } from "../src/config.js";
import type { TradePlan } from "../src/strategy.js";

const baseConfig: AgentConfig = {
  env: "testnet",
  enableTrading: false,
  symbol: "BTCUSDC",
  orderQty: 0.001,
  side: "BUY",
  maxNotionalUsdc: 100,
  maxLeverage: 3,
  timeoutMs: 15000,
};

const basePlan: TradePlan = {
  action: "PLACE_LIMIT_ORDER",
  symbol: "BTCUSDC",
  symbolCode: 1,
  side: "BUY",
  qty: 0.001,
  price: 50000,
  maxExchangeLeverage: 40,
};

describe("evaluateRisk", () => {
  it("allows a plan within local and exchange limits", () => {
    const result = evaluateRisk(basePlan, baseConfig);

    expect(result).toEqual({ ok: true, notionalUsdc: 50, reasons: [] });
  });

  it("blocks orders above local notional limit", () => {
    const result = evaluateRisk(
      { ...basePlan, qty: 0.01 },
      baseConfig,
    );

    expect(result.ok).toBe(false);
    expect(result.reasons).toContain("notional 500 exceeds AFX_MAX_NOTIONAL_USDC 100");
  });

  it("blocks local leverage above exchange max leverage", () => {
    const result = evaluateRisk(
      { ...basePlan, maxExchangeLeverage: 2 },
      baseConfig,
    );

    expect(result.ok).toBe(false);
    expect(result.reasons).toContain("configured leverage 3 exceeds exchange max leverage 2");
  });
});
