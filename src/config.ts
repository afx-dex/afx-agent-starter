export type AfxEnv = "testnet" | "mainnet";
export type OrderSide = "BUY" | "SELL";

export interface AgentConfig {
  env: AfxEnv;
  enableTrading: boolean;
  symbol: string;
  orderQty: number;
  orderPrice?: number;
  side: OrderSide;
  maxNotionalUsdc: number;
  maxLeverage: number;
  timeoutMs: number;
  proxyUrl?: string;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AgentConfig {
  const afxEnv = parseEnv(env.AFX_ENV);
  const symbol = (env.AFX_SYMBOL ?? "BTCUSDC").trim().toUpperCase();

  if (!symbol) {
    throw new Error("AFX_SYMBOL is required");
  }

  return {
    env: afxEnv,
    enableTrading: parseBoolean(env.AFX_ENABLE_TRADING, false),
    symbol,
    orderQty: parsePositiveNumber(env.AFX_ORDER_QTY, "AFX_ORDER_QTY", 0.001),
    orderPrice: parseOptionalPositiveNumber(env.AFX_ORDER_PRICE, "AFX_ORDER_PRICE"),
    side: parseSide(env.AFX_SIDE),
    maxNotionalUsdc: parsePositiveNumber(env.AFX_MAX_NOTIONAL_USDC, "AFX_MAX_NOTIONAL_USDC", 100),
    maxLeverage: parsePositiveNumber(env.AFX_MAX_LEVERAGE, "AFX_MAX_LEVERAGE", 3),
    timeoutMs: parsePositiveNumber(env.AFX_TIMEOUT_MS, "AFX_TIMEOUT_MS", 15000),
    proxyUrl: blankToUndefined(env.AFX_PROXY_URL),
  };
}

function parseEnv(value: string | undefined): AfxEnv {
  const normalized = (value ?? "testnet").trim().toLowerCase();
  if (normalized === "testnet" || normalized === "mainnet") return normalized;
  throw new Error("AFX_ENV must be testnet or mainnet");
}

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value.trim() === "") return fallback;
  const normalized = value.trim().toLowerCase();
  if (["true", "1", "yes", "on"].includes(normalized)) return true;
  if (["false", "0", "no", "off"].includes(normalized)) return false;
  throw new Error("AFX_ENABLE_TRADING must be true or false");
}

function parseSide(value: string | undefined): OrderSide {
  const normalized = (value ?? "BUY").trim().toUpperCase();
  if (normalized === "BUY" || normalized === "SELL") return normalized;
  throw new Error("AFX_SIDE must be BUY or SELL");
}

function parsePositiveNumber(value: string | undefined, name: string, fallback: number): number {
  if (value === undefined || value.trim() === "") return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${name} must be greater than 0`);
  }
  return parsed;
}

function parseOptionalPositiveNumber(value: string | undefined, name: string): number | undefined {
  if (value === undefined || value.trim() === "") return undefined;
  return parsePositiveNumber(value, name, 0);
}

function blankToUndefined(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}
