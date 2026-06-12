import "dotenv/config";
import { fileURLToPath } from "node:url";
import { Wallet } from "ethers";
import { AfxClient, getEnvironment, HttpTransport, InfoClient, type AfxWallet } from "@afx-dex/afx-js-sdk";
import { loadConfig, type AgentConfig } from "./config.js";
import { evaluateRisk, type RiskResult } from "./risk.js";
import { buildStarterPlan, type ProductMetadata, type TradePlan } from "./strategy.js";

interface StarterClient {
  info: {
    getProducts(): Promise<unknown>;
    getWallet?(): Promise<unknown>;
    getActiveAgent?(agentName: string): Promise<unknown>;
  };
  exchange: {
    faucetClaim?(): Promise<unknown>;
    approveAgent?(options?: { agentName?: string; validitySeconds?: number }): Promise<unknown>;
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
  onboardTestnetWallet?: boolean;
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

  if (options.onboardTestnetWallet) {
    if (options.config.env !== "testnet") {
      log("Risk blocked: ephemeral wallet onboarding is only available on testnet.");
      return { mode: "blocked", plan, risk };
    }
    if (!options.client.exchange.faucetClaim || !options.client.exchange.approveAgent) {
      throw new Error("testnet onboarding requires faucetClaim and approveAgent support");
    }
    log("Onboarding ephemeral testnet wallet: claiming faucet funds and approving agent.");
    assertAfxSuccess(await options.client.exchange.faucetClaim(), "faucetClaim");
    await waitForWalletReady(options.client, log);
    const agentName = "afx-agent-starter";
    assertAfxSuccess(await options.client.exchange.approveAgent({
      agentName,
      validitySeconds: 604800,
    }), "approveAgent");
    await waitForActiveAgent(options.client, agentName, log);
  }

  assertAfxSuccess(await options.client.exchange.setLeverage({
    symbolCode: plan.symbolCode,
    leverage: options.config.maxLeverage,
  }), "setLeverage");
  assertAfxSuccess(await options.client.exchange.placeOrder({
    symbolCode: plan.symbolCode,
    px: String(plan.price),
    qty: String(plan.qty),
    side: plan.side,
    ordType: "LIMIT",
    tif: "GTC",
  }), "placeOrder");

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

export function createStarterClient(config: AgentConfig, log: (line: string) => void = console.log): {
  client: StarterClient;
  onboardTestnetWallet: boolean;
} {
  const environment = getEnvironment(config.env === "testnet");

  if (!config.enableTrading) {
    return {
      client: {
        info: new InfoClient(new HttpTransport(environment.baseUrl, {
          timeoutMs: config.timeoutMs,
          proxyUrl: config.proxyUrl,
        })),
        exchange: {
          async setLeverage() {
            throw new Error("setLeverage is unavailable in dry-run mode");
          },
          async placeOrder() {
            throw new Error("placeOrder is unavailable in dry-run mode");
          },
        },
      },
      onboardTestnetWallet: false,
    };
  }

  if (process.env.AFX_MASTER_PRIVATE_KEY && process.env.AFX_AGENT_PRIVATE_KEY) {
    return {
      client: AfxClient.fromEnv({
        testnet: config.env === "testnet",
        timeoutMs: config.timeoutMs,
        proxyUrl: config.proxyUrl,
      }),
      onboardTestnetWallet: false,
    };
  }

  if (config.env !== "testnet") {
    throw new Error("mainnet trading requires explicit AFX_MASTER_PRIVATE_KEY and AFX_AGENT_PRIVATE_KEY");
  }

  const wallet = createEphemeralWallet();
  log(`Created ephemeral testnet master wallet: ${wallet.masterAddress}`);
  log(`Created ephemeral testnet agent wallet: ${wallet.agentAddress}`);
  log("Ephemeral private keys are held in memory only and are not written to disk.");

  return {
    client: new AfxClient({
      wallet,
      environment,
      timeoutMs: config.timeoutMs,
      proxyUrl: config.proxyUrl,
    }),
    onboardTestnetWallet: true,
  };
}

export function createEphemeralWallet(): AfxWallet {
  const master = new Wallet(Wallet.createRandom().privateKey);
  const agent = new Wallet(Wallet.createRandom().privateKey);
  return {
    master,
    agent,
    masterAddress: master.address,
    agentAddress: agent.address,
  };
}

async function main(): Promise<void> {
  const config = loadConfig();
  const { client, onboardTestnetWallet } = createStarterClient(config);
  await runAgent({ config, client, onboardTestnetWallet });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function assertAfxSuccess(response: unknown, step: string): void {
  if (!isRecord(response) || response.code === undefined) return;
  if (response.code !== 0) {
    throw new Error(`${step} failed: ${String(response.message ?? "unknown error")}`);
  }
}

async function waitForWalletReady(client: StarterClient, log: (line: string) => void): Promise<void> {
  if (!client.info.getWallet) return;
  await waitFor("testnet faucet balance", async () => {
    const response = await client.info.getWallet!();
    return isRecord(response) && Array.isArray(response.data) && response.data.length > 0;
  }, log);
}

async function waitForActiveAgent(client: StarterClient, agentName: string, log: (line: string) => void): Promise<void> {
  if (!client.info.getActiveAgent) return;
  await waitFor("active agent approval", async () => {
    const response = await client.info.getActiveAgent!(agentName);
    return isRecord(response) && Boolean(response.data);
  }, log);
}

async function waitFor(label: string, probe: () => Promise<boolean>, log: (line: string) => void): Promise<void> {
  for (let attempt = 1; attempt <= 10; attempt += 1) {
    if (await probe()) return;
    log(`Waiting for ${label} (${attempt}/10).`);
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
  throw new Error(`Timed out waiting for ${label}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
