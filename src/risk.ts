import type { AgentConfig } from "./config.js";
import type { TradePlan } from "./strategy.js";

export interface RiskResult {
  ok: boolean;
  notionalUsdc: number;
  reasons: string[];
}

export function evaluateRisk(plan: TradePlan, config: AgentConfig): RiskResult {
  const notionalUsdc = round(plan.price * plan.qty);
  const reasons: string[] = [];

  if (notionalUsdc > config.maxNotionalUsdc) {
    reasons.push(`notional ${notionalUsdc} exceeds AFX_MAX_NOTIONAL_USDC ${config.maxNotionalUsdc}`);
  }

  if (config.maxLeverage > plan.maxExchangeLeverage) {
    reasons.push(`configured leverage ${config.maxLeverage} exceeds exchange max leverage ${plan.maxExchangeLeverage}`);
  }

  return {
    ok: reasons.length === 0,
    notionalUsdc,
    reasons,
  };
}

function round(value: number): number {
  return Math.round(value * 1e8) / 1e8;
}
