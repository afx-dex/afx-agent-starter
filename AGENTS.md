# AFX Agent Starter Instructions

This file is for AI coding agents and AI trader agents operating this repository.

## Purpose

`afx-agent-starter` is a safe TypeScript starter for building trading agents on AFX. It demonstrates testnet-first setup, live product metadata lookup, local pre-trade risk checks, and guarded order submission through the AFX JavaScript SDK.

## Non-Negotiable Safety Rules

- Default to `testnet`.
- Default to dry-run mode.
- Do not use mainnet unless the human explicitly asks for it.
- Do not enable trading unless the human explicitly asks for testnet execution.
- Do not invent, request in chat, print, commit, or persist private keys.
- Do not submit orders if `AFX_MAX_NOTIONAL_USDC` or `AFX_MAX_LEVERAGE` is missing.
- Do not hardcode symbol codes. Resolve markets through live product metadata.

## Setup

Run:

```bash
npm install
```

If `.env` does not exist, create it from the example:

```bash
cp .env.example .env
```

The `.env` file must stay uncommitted.

## Required Environment

For dry-run, these values are expected:

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

For testnet execution, the environment must also contain:

```bash
AFX_MASTER_PRIVATE_KEY=<provided outside the repo>
AFX_AGENT_PRIVATE_KEY=<provided outside the repo>
AFX_ENABLE_TRADING=true
AFX_ORDER_PRICE=<explicit limit price>
```

Never write private key values into this file, README, source code, test fixtures, logs, or commits.

## Verification

Before running the agent, run:

```bash
npm test
npm run typecheck
npm run build
```

Expected result: all commands exit successfully.

## Dry-Run Flow

Use dry-run first:

```bash
npm run dev
```

In dry-run mode, the starter should fetch product metadata, build a trade plan, evaluate risk, and print the plan without submitting orders.

## Testnet Execution Flow

Only after explicit human approval for testnet trading:

1. Confirm `AFX_ENV=testnet`.
2. Confirm `AFX_ENABLE_TRADING=true`.
3. Confirm `AFX_MASTER_PRIVATE_KEY` and `AFX_AGENT_PRIVATE_KEY` are present in the environment or `.env`.
4. Confirm `AFX_ORDER_PRICE`, `AFX_MAX_NOTIONAL_USDC`, and `AFX_MAX_LEVERAGE` are set.
5. Run:

```bash
npm run dev
```

If any guardrail is missing, stop and report the missing requirement instead of attempting to trade.

## Related Agent Skills

For lower-level agent-facing primitives, see:

- `https://github.com/afx-dex/afx-agent-skills`
- `afx-market-discovery`
- `afx-pretrade-risk`
- `afx-testnet-trading`
