# Private DeFi Health Checker

Privately check if a DeFi lending position is safe from liquidation. Uses Fhenix CoFHE so the blockchain never sees your collateral, debt, or health ratio — only an encrypted boolean that only you can decrypt.

## Deployed Contract

**Arbitrum Sepolia**: [`0xe6f37B67E7514f3AFe33F278f4dBa1DCBBd143c0`](https://sepolia.arbiscan.io/address/0xe6f37B67E7514f3AFe33F278f4dBa1DCBBd143c0)

## How It Works

1. Collateral and debt values are encrypted client-side with a ZK proof
2. The contract computes `health = collateral × 100 / debt` on encrypted data
3. It checks `health >= 150` (liquidation threshold) and stores an encrypted boolean
4. Only the caller can decrypt the result via an EIP-712 permit

## Project Structure

```
contracts-app/        # Hardhat + CoFHE (contract, tests, deploy/interact tasks)
frontend/             # React + Vite + wagmi + RainbowKit + @cofhe/sdk
```

## Run Tests

```bash
cd contracts-app
pnpm install
pnpm test
```

10 tests pass against the Hardhat mock FHE environment (no testnet ETH needed).

## Deploy

```bash
cd contracts-app
cp .env.example .env
# Add PRIVATE_KEY and ARBITRUM_SEPOLIA_RPC_URL
pnpm arb-sepolia:deploy
```

## CLI Interaction

```bash
pnpm arb-sepolia:check-health --collateral 200 --debt 100
# ✓ Safe — no liquidation risk

pnpm arb-sepolia:check-health --collateral 100 --debt 100
# ✗ At Risk — add collateral or repay debt
```

## Frontend

```bash
cd frontend
npm install
npm run dev
```

Connect MetaMask on Arbitrum Sepolia, enter values, check your health privately.

## Contract

- Solidity 0.8.28, cancun EVM
- `euint64` for gas efficiency
- Division-by-zero handled via `FHE.select` (zero debt = safe, no leak)
- Only the caller can decrypt their result (`FHE.allowSender`)
- 150% liquidation threshold

## Stack

- [Fhenix CoFHE](https://cofhe-docs.fhenix.zone/) + [@cofhe/sdk](https://cofhe-docs.fhenix.zone/client-sdk/introduction/overview)
- [Hardhat](https://hardhat.org/) + [@cofhe/hardhat-plugin](https://cofhe-docs.fhenix.zone/client-sdk/hardhat-plugin/getting-started)
- [React](https://react.dev/) + [Vite](https://vite.dev/) + [wagmi](https://wagmi.sh/) + [RainbowKit](https://www.rainbowkit.com/)
