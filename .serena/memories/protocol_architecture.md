# Protocol Architecture

## Core Architecture Components

### BaseProtocol (`classes/BaseProtocol.js`)

Abstract base class defining the standard interface for all DeFi protocol integrations:

- **Standard Operations**: `zapIn`, `zapOut`, `stake`, `unstake`, `transfer`, `claimAndSwap`
- **Required Implementations**: `customDeposit`, `customWithdrawAndClaim`, `_stake`, `_unstake`, `pendingRewards`
- **Metadata**: `protocolName`, `protocolVersion`, `assetContract`, `protocolContract`

### BaseVault (`classes/Vaults/BaseVault.js`)

Portfolio orchestrator managing multiple protocols with weighted allocations:

- **Strategy Definition**: Nested structure `{category: {chain: [{interface: protocol, weight: number}]}}`
- **Weight Management**: Category-level allocations that must sum to 1.0
- **Auto-normalization**: Weights within categories are automatically normalized
- **Validation**: Strict validation prevents duplicate protocols and ensures weight consistency

### BasePortfolio (`classes/BasePortfolio.jsx`)

Main portfolio management logic containing extensive business logic for:

- Cross-chain rebalancing calculations
- USD value aggregation and balance tracking
- Bridge transaction coordination
- Fee management and protocol treasury operations

## Protocol Integration Workflow

1. **Research**: Interact with protocol via wallet, capture transaction details
2. **Implementation**: Create protocol class inheriting BaseProtocol, save ABI to `lib/contracts/`
3. **Integration**: Add to existing vault or create new vault class
4. **Testing**: Create isolated test vault and test cases in `__tests__/intent/`
5. **Backend**: Update transaction parser in rebalance backend

## Transaction Building

- **ThirdWeb Integration**: Uses ThirdWeb SDK for contract interactions
- **Batch Operations**: All operations return arrays of transactions for atomic execution
- **Cross-chain Support**: Bridge integration via Squid and Across protocols
- **Smart Wallet**: Account abstraction for gasless transactions

## Flow Chart System

Real-time transaction progress tracking via event emitters in `utils/FlowChartEventEmitter.js`
