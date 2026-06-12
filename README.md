# AFX Agent Starter

A safe TypeScript starter for building trading agents on AFX.

## For AI Agents

If you are an AI agent, read [AGENTS.md](./AGENTS.md) before setup or execution. It defines the safe testnet workflow, automatic ephemeral wallet onboarding, verification commands, and trading guardrails for this repository.

This project is intentionally small. It shows how to:

- load AFX agent configuration from environment variables
- query live product metadata through the AFX JavaScript SDK
- build a simple limit-order trade plan
- run local risk checks before any order is submitted
- keep trading disabled by default while developing strategies

## Quick Start

```bash
git clone https://github.com/afx-dex/afx-agent-starter.git
cd afx-agent-starter
npm install
cp .env.example .env
npm run dev
```

The starter defaults to `testnet` and dry-run mode. Dry-run does not require wallet private keys.

It will not submit orders unless you explicitly set:

```bash
AFX_ENABLE_TRADING=true
```

When testnet trading is enabled and no wallet keys are provided, the starter creates ephemeral master and agent wallets in memory, claims testnet faucet funds, approves the agent wallet, and then submits the guarded test order. It does not write generated private keys to disk.

## Environment

Set these values in `.env`:

```bash
AFX_ENV=testnet
AFX_ENABLE_TRADING=false
AFX_SYMBOL=BTCUSDC
AFX_ORDER_QTY=0.001
AFX_ORDER_PRICE=
AFX_SIDE=BUY
AFX_MAX_NOTIONAL_USDC=100
AFX_MAX_LEVERAGE=3
```

`AFX_MASTER_PRIVATE_KEY` and `AFX_AGENT_PRIVATE_KEY` are optional on testnet. If they are absent during testnet execution, ephemeral wallets are generated in memory.

`AFX_ORDER_PRICE` is optional for dry-run exploration. If it is omitted, the starter uses the product metadata minimum price as a conservative placeholder. For testnet execution, set an explicit price and review the generated plan before enabling trading.

## Safety Defaults

The starter has three layers of protection:

- `AFX_ENABLE_TRADING=false` by default
- local max notional check through `AFX_MAX_NOTIONAL_USDC`
- local leverage check against live exchange metadata
- ephemeral testnet wallets are never written to disk

The example strategy is not investment advice and is not intended to be profitable. Treat it as wiring for your own strategy, risk model, and monitoring.

## Project Structure

```text
src/config.ts     environment parsing and validation
src/strategy.ts   product metadata lookup and starter trade plan
src/risk.ts       local pre-trade risk checks
src/agent.ts      SDK wiring, dry-run mode, and guarded order submission
test/             unit tests for config, strategy, risk, and agent behavior
```

## Commands

```bash
npm run typecheck
npm test
npm run build
npm run dev
```

## SDK Dependency

This starter currently depends on the GitHub version of the AFX JavaScript SDK:

```json
"@afx-dex/afx-js-sdk": "git+https://github.com/afx-dex/afx-js-sdk.git#main"
```

Once the SDK is published to npm, switch this dependency to the npm package version.
