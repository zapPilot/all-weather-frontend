# Code Style & Conventions

## Code Quality Standards

- **TypeScript**: Configured with strict settings but `strict: false` in tsconfig.json
- **ESLint**: Uses Next.js core web vitals config with custom rules
- **Prettier**: Enforced formatting with 3.0.2, ignores specified in .prettierignore
- **Pre-commit Hooks**: Husky enforces formatting and linting before commits

## File Organization

```
classes/              # Core protocol architecture
├── BaseProtocol.js   # Abstract base class for all DeFi protocols
├── BasePortfolio.jsx # Main portfolio management logic
├── Vaults/           # Portfolio orchestrators with weighted allocations
├── mixins/           # Reusable functionality mixins
└── [Protocol]/       # Individual protocol implementations
```

## Protocol Integration Pattern

1. **Inherit from BaseProtocol** - All protocols extend the base class
2. **Implement Standard Methods**: `customDeposit`, `customWithdrawAndClaim`, `_stake`, `_unstake`, `pendingRewards`
3. **Set Metadata**: `protocolName`, `protocolVersion`, `assetContract`, `protocolContract`
4. **Handle Modes**: Support both "single" token and "LP" token modes

## Naming Conventions

- **Files**: PascalCase for classes (e.g., `BaseProtocol.js`), camelCase for utilities
- **Components**: PascalCase React components in JSX/TSX files
- **Variables**: camelCase for variables and functions
- **Constants**: UPPER_SNAKE_CASE for constants

## Import/Export Patterns

- Prefer named exports over default exports
- Use absolute imports when possible
- Store ABIs in `lib/contracts/` directory

## Memory Optimization Requirements

- **Critical**: Never import large JSON files (>1MB) in eager-loaded components
- **Smart Contract ABIs**: Use minimal ABIs only with required functions
- **Lazy Loading**: Use React.lazy() + Suspense for heavy components
- **Target**: <350MB RAM usage during development
