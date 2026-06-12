import type { AgentConfig, OrderSide } from "./config.js";

export interface ProductMetadata {
  symbol: string;
  code: string | number;
  baseCurrency?: string;
  settleCurrency?: string;
  maxLeverage: number;
  listStatus: string;
  minimumPrice?: string | number;
}

export interface TradePlan {
  action: "PLACE_LIMIT_ORDER";
  symbol: string;
  symbolCode: number;
  side: OrderSide;
  qty: number;
  price: number;
  maxExchangeLeverage: number;
}

export function buildStarterPlan(config: AgentConfig, products: ProductMetadata[]): TradePlan {
  const product = products.find((item) => item.symbol.toUpperCase() === config.symbol);
  if (!product || product.listStatus !== "listed") {
    throw new Error(`${config.symbol} is not listed`);
  }

  const symbolCode = Number(product.code);
  if (!Number.isInteger(symbolCode) || symbolCode <= 0) {
    throw new Error(`${config.symbol} has an invalid symbol code`);
  }

  return {
    action: "PLACE_LIMIT_ORDER",
    symbol: product.symbol,
    symbolCode,
    side: config.side,
    qty: config.orderQty,
    price: config.orderPrice ?? safeFallbackPrice(product),
    maxExchangeLeverage: product.maxLeverage,
  };
}

function safeFallbackPrice(product: ProductMetadata): number {
  const minimumPrice = Number(product.minimumPrice ?? 1);
  if (Number.isFinite(minimumPrice) && minimumPrice > 0) return minimumPrice;
  return 1;
}
