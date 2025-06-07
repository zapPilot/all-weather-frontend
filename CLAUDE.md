# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `yarn` - Install dependencies
- `doppler run -- yarn dev` - Start development server (requires `.env.local` config)
- `yarn build` - Build for production
- `yarn lint` - Run ESLint with auto-fix
- `yarn format` - Format code with Prettier and Black
- `yarn test` - Run Vitest tests (140s timeout)
- `yarn test-ui` - Start Vitest UI at http://localhost:51204/**vitest**/
- `yarn coverage` - Run test coverage report

## Project Architecture

### Core Protocol System

This is a DeFi portfolio management application built around a modular protocol architecture:

- **BaseProtocol** (`classes/BaseProtocol.js`) - Abstract base class for all DeFi protocol integrations. Defines standard operations: `zapIn`, `zapOut`, `stake`, `unstake`, `transfer`, `claimAndSwap`
- **BaseVault** (`classes/Vaults/BaseVault.js`) - Portfolio orchestrator that manages multiple protocols with weighted allocations across categories and chains
- **Protocol Classes** - Concrete implementations for specific protocols (Aave, Convex, Moonwell, Camelot, etc.) that inherit from BaseProtocol

### Protocol Integration Pattern

Each protocol integration follows this structure:

1. Inherit from BaseProtocol
2. Implement required methods: `customDeposit`, `customWithdrawAndClaim`, `_stake`, `_unstake`, `pendingRewards`, etc.
3. Set protocol metadata: `protocolName`, `protocolVersion`, `assetContract`, `protocolContract`
4. Handle both "single" token and "LP" token modes via the `mode` parameter

### Vault Architecture

Vaults combine multiple protocols with weighted allocations:

- **Strategy Definition** - Nested structure: `{category: {chain: [{interface: protocol, weight: number}]}}`
- **Weight Mapping** - Category-level allocations that must sum to 1.0
- **Auto-normalization** - Weights within categories are automatically normalized
- **Validation** - Strict validation prevents duplicate protocols and ensures weight consistency

### Transaction Building

- **ThirdWeb Integration** - Uses ThirdWeb SDK for contract interactions (`utils/thirdwebSmartWallet.ts`)
- **Batch Operations** - All operations return arrays of transactions for atomic execution
- **Cross-chain Support** - Bridge integration via Squid and Across protocols
- **Smart Wallet** - Account abstraction for gasless transactions

### Key Utilities

- **Swap Helper** (`utils/swapHelper.js`) - Handles token swaps via 1inch API
- **Portfolio Calculation** (`utils/portfolioCalculation.js`) - USD value calculations and balance aggregation
- **Chain Management** (`utils/general.js`) - Chain constants and provider management
- **Flow Chart System** - Real-time transaction progress tracking via event emitters

## Testing Guidelines

- Tests are in `__tests__/` with intent-specific subdirectory for protocol tests
- Create test vaults containing only your protocol for isolated testing
- Copy existing test patterns from `__tests__/intent/` when adding new protocol tests
- Use `TEST=true` environment variable for test-specific behavior
- Comment out `loading={zapInIsLoading}` in ZapInTab.jsx for faster testing

## Protocol Integration Workflow

1. **Research** - Interact with protocol via wallet, capture transaction details from block explorer
2. **Implementation** - Create protocol class inheriting BaseProtocol, save ABI to `lib/contracts/`
3. **Integration** - Add protocol to existing vault or create new vault class
4. **Testing** - Create isolated test vault and test cases
5. **Backend** - Update transaction parser in rebalance backend

## Chain Integration

- Check bridge support for new chain
- Update `CHAIN_ID_TO_CHAIN` mapping in `utils/general.js`
- Configure gas sponsorship in ThirdWeb settings
- Update UI chain selection components
- Modify `switchNextChain` and `chainMap` in indexOverviews.jsx

## Development Notes

- Environment setup requires copying `.env.sample` to `.env.local`
- Uses Doppler for environment variable management in development
- CI/CD requires `yarn format` before commits (Prettier enforcement)
- Deployment: staging on `main` branch, production on `prod` branch via Fleek
- Asset images stored in `public/` with WebP format for chains and protocols
