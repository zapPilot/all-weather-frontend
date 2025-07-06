# Intent-Based DeFi Execution Engine

**Zap Pilot** is a general-purpose intent-based DeFi execution engine that provides a universal interface for DeFi operations across multiple protocols and chains. The platform enables users to manage various vault strategies including Stablecoin Vault, Index500 (S&P500-like index fund), BTC vault, ETH vault, with support for customizable vaults.

## Getting Started

### Prerequisites

1. Copy environment configuration: `cp .env.sample .env.local` and update values as needed
2. Install dependencies: `yarn`
3. Start development server: `doppler run -- yarn dev`

Open [http://localhost:3000](http://localhost:3000) to view the application.

You can start editing by modifying `pages/index.tsx` - the page auto-updates as you edit.

## Wallet Mode Control

The application supports URL parameters to control the initial wallet connection mode, allowing users to specify whether they want to use **Account Abstraction (AA)** or **Externally Owned Account (EOA)** mode.

### URL Parameters

| Parameter | Values | Description |
|-----------|---------|-------------|
| `mode` | `aa` \| `eoa` | Sets wallet mode (Account Abstraction or EOA) |
| `walletMode` | `aa` \| `eoa` | Alternative parameter name for wallet mode |

### Usage Examples

```bash
# Account Abstraction mode (gasless transactions)
https://localhost:3000/?mode=aa
https://localhost:3000/?walletMode=aa

# Externally Owned Account mode (traditional wallet)
https://localhost:3000/?mode=eoa  
https://localhost:3000/?walletMode=eoa

# Default behavior (AA mode) - no parameter needed
https://localhost:3000/
```

### Features

- **One-time initialization**: URL sets the initial wallet mode, but users can still toggle afterward
- **Case insensitive**: `aa`, `AA`, `Aa` all work the same way
- **Fallback support**: Invalid or missing parameters default to AA mode
- **Backward compatible**: Existing URLs without parameters continue to work
- **Deep linking**: Perfect for bookmarks, testing, and integration links

### Use Cases

1. **Development & Testing**
   ```bash
   # Test EOA mode specifically
   http://localhost:3000/?mode=eoa
   
   # Test AA mode with gasless transactions  
   http://localhost:3000/?mode=aa
   ```

2. **User Bookmarks**
   - Users can bookmark their preferred wallet mode
   - Returning users get their preferred experience immediately

3. **Integration Links**
   ```bash
   # Partner integrations can specify wallet mode
   https://yourapp.com/vault/btc?mode=eoa
   ```

4. **Documentation & Tutorials**
   ```bash
   # Tutorial links can demonstrate specific wallet modes
   https://docs.yourapp.com/guide?mode=aa
   ```

### Technical Implementation

The URL parameter is processed in `WalletModeContext.jsx` using Next.js router:
- Parameters are checked only on initial page load
- User toggle functionality remains fully intact
- Router state management ensures proper hydration

## Development Commands

- `yarn` - Install dependencies
- `doppler run -- yarn dev` - Start development server (requires `.env.local` config)
- `yarn build` - Build for production
- `yarn lint` - Run ESLint with auto-fix
- `yarn format` - Format code with Prettier and Black
- `yarn test` - Run Vitest tests (140s timeout)
- `yarn test-ui` - Start Vitest UI at http://localhost:51204/__vitest__/
- `yarn coverage` - Run test coverage report

## Architecture Overview

### Core Protocol System

The application is built around a modular protocol architecture:

- **BaseProtocol** (`classes/BaseProtocol.js`) - Abstract base class for all DeFi protocol integrations
- **BaseVault** (`classes/Vaults/BaseVault.js`) - Portfolio orchestrator managing multiple protocols with weighted allocations
- **Protocol Classes** - Concrete implementations for specific protocols (Aave, Convex, Moonwell, Camelot, etc.)

### Key Operations

All protocols support standard operations:
- `zapIn` - Deposit funds into protocol
- `zapOut` - Withdraw funds from protocol  
- `stake`/`unstake` - Manage staking positions
- `transfer` - Move assets between accounts
- `claimAndSwap` - Harvest rewards and convert

### Vault Strategy

Vaults combine multiple protocols with weighted allocations across categories and chains:
- **Strategy Definition**: `{category: {chain: [{interface: protocol, weight: number}]}}`
- **Weight Mapping**: Category-level allocations that must sum to 1.0
- **Auto-normalization**: Weights within categories are automatically normalized

## Testing

### Vitest Configuration

1. Tests are located in `__tests__/` directory
2. Protocol-specific tests in `__tests__/intent/` subdirectory
3. Running tests: `yarn test`
4. UI interface: `yarn test-ui` → http://localhost:51204/__vitest__/
5. Coverage reports: `yarn coverage`

### Testing Guidelines

- Create test vaults containing only your protocol for isolated testing
- Copy existing test patterns from `__tests__/intent/` when adding new protocol tests
- Comment out `loading={zapInIsLoading}` in ZapInTab.jsx for faster testing
- Use `TEST=true` environment variable for test-specific behavior

## Development Workflows

### Integrating New Protocols

1. **Research Phase**
   - Interact with the protocol using your wallet
   - Capture transaction details from block explorer ([example txn](https://arbiscan.io/tx/0x89732a3f4d946ba1a29b78aabac6114bb62aba236cd77eacbd7417d8c49fb15e))
   - Extract: function name, parameters, contract address, ABI
   - Save ABI files to `lib/contracts/` directory

2. **Implementation**
   - Inherit from [BaseProtocol.js](./classes/BaseProtocol.js)
   - Implement required methods: `customDeposit`, `customWithdrawAndClaim`, `_stake`, `_unstake`, `pendingRewards`
   - Set protocol metadata: `protocolName`, `protocolVersion`, contract addresses
   - Handle both "single" token and "LP" token modes

3. **Integration**
   - Add protocol to existing vault (like [EthVault](./classes/Vaults/EthVault.jsx)) or create new vault
   - Update vault strategy in [./utils/thirdwebSmartWallet.ts](./utils/thirdwebSmartWallet.ts)
   - Add vault to [landing page](./pages/indexes/index.jsx)

4. **Testing**
   - Create isolated test vault with only your protocol
   - Copy and modify test cases from [__tests__/intent/](./__tests__/intent/)
   - Test frontend integration

5. **Backend Integration**
   - Update transaction parser in rebalance backend: `_find_refund_data_by_txn_hash()`

### Integrating New Chains

Reference: [ThirdWeb Supported Chains](https://portal.thirdweb.com/connect#supported-chains)

1. Verify bridge support for the new chain
2. Update chain mappings in `utils/general.js` (`CHAIN_ID_TO_CHAIN`, etc.)
3. Configure gas sponsorship settings in ThirdWeb
4. Update UI components for chain selection
5. Modify chain-specific functions in `indexOverviews.jsx`:
   - `switchNextChain`
   - `chainStatus` state management
   - `chainMap` object

## CI/CD & Deployment

### Pre-commit Requirements

1. Code formatting: Run `yarn format` before committing (enforced by Prettier in CI)
2. Tests: Run `yarn test` before committing

### Deployment Environments

- **Staging** (branch `main`): https://all-weather-protocol-staging.on.fleek.co/
- **Production** (branch `prod`): https://all-weather-protocol.on.fleek.co/

## Asset Management

For updating chain/protocol/token images, refer to [public/README.md](public/README.md).

Images are stored in WebP format in:
- `public/chainPicturesWebp/` - Chain logos
- `public/projectPictures/` - Protocol logos

## Development Tips

- Comment out other protocols in vaults during development to speed up testing
- Comment out transaction calls (`depositTxn`, `stakeTxn`) in protocol classes for UI testing
- Use isolated test vaults for protocol development
- Environment setup requires Doppler for environment variable management

---

For detailed architecture information, see [CLAUDE.md](./CLAUDE.md).