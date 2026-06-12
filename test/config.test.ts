import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/config.js";

describe("loadConfig", () => {
  it("defaults to testnet dry-run mode", () => {
    const config = loadConfig({});

    expect(config.env).toBe("testnet");
    expect(config.enableTrading).toBe(false);
    expect(config.symbol).toBe("BTCUSDC");
    expect(config.maxNotionalUsdc).toBe(100);
  });

  it("parses explicit trading and risk settings", () => {
    const config = loadConfig({
      AFX_ENV: "mainnet",
      AFX_ENABLE_TRADING: "true",
      AFX_SYMBOL: "ETHUSDC",
      AFX_ORDER_QTY: "0.25",
      AFX_ORDER_PRICE: "3000",
      AFX_SIDE: "SELL",
      AFX_MAX_NOTIONAL_USDC: "500",
      AFX_MAX_LEVERAGE: "4",
      AFX_TIMEOUT_MS: "20000",
    });

    expect(config).toMatchObject({
      env: "mainnet",
      enableTrading: true,
      symbol: "ETHUSDC",
      orderQty: 0.25,
      orderPrice: 3000,
      side: "SELL",
      maxNotionalUsdc: 500,
      maxLeverage: 4,
      timeoutMs: 20000,
    });
  });

  it("rejects invalid numeric settings", () => {
    expect(() => loadConfig({ AFX_ORDER_QTY: "0" })).toThrow("AFX_ORDER_QTY must be greater than 0");
    expect(() => loadConfig({ AFX_MAX_LEVERAGE: "0" })).toThrow("AFX_MAX_LEVERAGE must be greater than 0");
  });
});
