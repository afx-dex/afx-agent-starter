import { describe, expect, it } from "vitest";
import { buildStarterPlan } from "../src/strategy.js";
import type { AgentConfig } from "../src/config.js";

const config: AgentConfig = {
  env: "testnet",
  enableTrading: false,
  symbol: "BTCUSDC",
  orderQty: 0.001,
  side: "BUY",
  maxNotionalUsdc: 100,
  maxLeverage: 3,
  timeoutMs: 15000,
};

describe("buildStarterPlan", () => {
  it("uses live product metadata as the symbol source of truth", () => {
    const plan = buildStarterPlan(config, [
      {
        symbol: "BTCUSDC",
        code: "1",
        baseCurrency: "BTC",
        settleCurrency: "USDC",
        maxLeverage: 40,
        listStatus: "listed",
      },
    ]);

    expect(plan).toMatchObject({
      action: "PLACE_LIMIT_ORDER",
      symbol: "BTCUSDC",
      symbolCode: 1,
      side: "BUY",
      qty: 0.001,
      maxExchangeLeverage: 40,
    });
  });

  it("rejects symbols that are missing or not listed", () => {
    expect(() => buildStarterPlan(config, [])).toThrow("BTCUSDC is not listed");
    expect(() =>
      buildStarterPlan(config, [
        {
          symbol: "BTCUSDC",
          code: "1",
          baseCurrency: "BTC",
          settleCurrency: "USDC",
          maxLeverage: 40,
          listStatus: "delisted",
        },
      ]),
    ).toThrow("BTCUSDC is not listed");
  });
});
