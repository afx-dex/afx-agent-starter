import "dotenv/config";
import { fileURLToPath } from "node:url";
import { AfxClient } from "@afx-dex/afx-js-sdk";
import { loadConfig, type AgentConfig } from "./config.js";
import { evaluateRisk, type RiskResult } from "./risk.js";
import { buildStarterPlan, type ProductMetadata, type TradePlan } from "./strategy.js";

interface StarterClient {
  info: {
    getProducts(): Promise<unknown>;
  };
  exchange: {
    setLeverage(options: { symbolCode: number; leverage: number }): Promise<unknown>;
    placeOrder(options: {
      symbolCode: number;
      px: string;
      qty: string;
      side: "BUY" | "SELL";
      ordType: "LIMIT";
      tif: "GTC";
    }): Promise<unknown>;
  };
}

export interface RunAgentOptions {
  config: AgentConfig;
  client: StarterClient;
  log?: (line: string) => void;
}

export interface RunAgentResult {
  mode: "dry-run" | "trading" | "blocked";
  plan: TradePlan;
  risk: RiskResult;
}

export async function runAgent(options: RunAgentOptions): Promise<RunAgentResult> {
  const log = options.log ?? console.log;
  const products = extractProducts(await options.client.info.getProducts());
  const plan = buildStarterPlan(options.config, products);
  const risk = evaluateRisk(plan, options.config);

  log(`Plan: ${plan.side} ${plan.qty} ${plan.symbol} @ ${plan.price}`);
  log(`Notional: ${risk.notionalUsdc} USDC`);

  if (!risk.ok) {
    log(`Risk blocked: ${risk.reasons.join("; ")}`);
    return { mode: "blocked", plan, risk };
  }

  if (!options.config.enableTrading) {
    log("Trading disabled. Set AFX_ENABLE_TRADING=true only after reviewing this dry-run plan.");
    return { mode: "dry-run", plan, risk };
  }

  await options.client.exchange.setLeverage({
    symbolCode: plan.symbolCode,
    leverage: options.config.maxLeverage,
  });
  await options.client.exchange.placeOrder({
    symbolCode: plan.symbolCode,
    px: String(plan.price),
    qty: String(plan.qty),
    side: plan.side,
    ordType: "LIMIT",
    tif: "GTC",
  });

  log("Order submitted.");
  return { mode: "trading", plan, risk };
}

export function extractProducts(response: unknown): ProductMetadata[] {
  if (!isRecord(response)) throw new Error("product metadata response is not an object");
  const data = response.data;
  if (!isRecord(data)) throw new Error("product metadata response is missing data");
  const products = data.perpProducts;
  if (!Array.isArray(products)) throw new Error("product metadata response is missing data.perpProducts");
  return products as ProductMetadata[];
}

async function main(): Promise<void> {
  const config = loadConfig();
  const client = AfxClient.fromEnv({
    testnet: config.env === "testnet",
    timeoutMs: config.timeoutMs,
    proxyUrl: config.proxyUrl,
  });
  await runAgent({ config, client });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
