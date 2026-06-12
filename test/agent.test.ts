import { describe, expect, it, vi } from "vitest";
import { runAgent } from "../src/agent.js";
import type { AgentConfig } from "../src/config.js";

const config: AgentConfig = {
  env: "testnet",
  enableTrading: false,
  symbol: "BTCUSDC",
  orderQty: 0.001,
  orderPrice: 50000,
  side: "BUY",
  maxNotionalUsdc: 100,
  maxLeverage: 3,
  timeoutMs: 15000,
};

function client() {
  return {
    info: {
      getProducts: vi.fn(async () => ({
        code: 0,
        data: {
          perpProducts: [
            {
              symbol: "BTCUSDC",
              code: "1",
              maxLeverage: 40,
              listStatus: "listed",
            },
          ],
        },
      })),
    },
    exchange: {
      setLeverage: vi.fn(),
      placeOrder: vi.fn(),
    },
  };
}

describe("runAgent", () => {
  it("does not place orders while trading is disabled", async () => {
    const fakeClient = client();
    const lines: string[] = [];

    const result = await runAgent({ config, client: fakeClient, log: (line) => lines.push(line) });

    expect(result.mode).toBe("dry-run");
    expect(fakeClient.exchange.placeOrder).not.toHaveBeenCalled();
    expect(lines.join("\n")).toContain("Trading disabled");
  });

  it("sets leverage and places one limit order when trading is enabled and risk passes", async () => {
    const fakeClient = client();

    const result = await runAgent({
      config: { ...config, enableTrading: true },
      client: fakeClient,
      log: () => undefined,
    });

    expect(result.mode).toBe("trading");
    expect(fakeClient.exchange.setLeverage).toHaveBeenCalledWith({ symbolCode: 1, leverage: 3 });
    expect(fakeClient.exchange.placeOrder).toHaveBeenCalledWith({
      symbolCode: 1,
      px: "50000",
      qty: "0.001",
      side: "BUY",
      ordType: "LIMIT",
      tif: "GTC",
    });
  });

  it("blocks trading when risk fails", async () => {
    const fakeClient = client();

    const result = await runAgent({
      config: { ...config, enableTrading: true, maxNotionalUsdc: 10 },
      client: fakeClient,
      log: () => undefined,
    });

    expect(result.mode).toBe("blocked");
    expect(fakeClient.exchange.placeOrder).not.toHaveBeenCalled();
  });
});
