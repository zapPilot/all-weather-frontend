# Project Overview

The all-weather-frontend is a **DeFi portfolio management application** built around a modular protocol architecture for cross-chain yield farming and liquidity provision. The project was originally implementing Ray Dalio's All Weather Portfolio strategy but has now transitioned to become a **general-purpose intent-based execution engine**.

## Key Purpose

- **Intent-based DeFi Protocol Aggregation**: Universal interface for DeFi operations across multiple protocols and chains
- **Cross-chain Portfolio Management**: Manages yield farming positions and liquidity provision across 20+ blockchain networks
- **Modular Architecture**: Extensible system for adding new DeFi protocols and chains
- **Automated Rebalancing**: Intelligent portfolio rebalancing with mathematical models

## Architecture Components

1. **Frontend** (this repo) - Next.js/React Web3 application with ThirdWeb SDK integration
2. **Backend** (`../backend/`) - Node.js/Express API for user management and reporting
3. **Rebalance Engine** (`../rebalance_backend/`) - Python/Flask portfolio analysis service
4. **Analytics Engine** (`../index500/`) - Python-based index fund strategy analysis

## Core Technology Stack

- **Frontend**: Next.js 13, React 18, TypeScript, Tailwind CSS, ThirdWeb SDK, Ethers.js, Viem
- **Web3**: ThirdWeb SDK for wallet connections, account abstraction with smart wallets
- **Testing**: Vitest with React Testing Library (140s timeout, 75% coverage requirements)
- **Development**: Doppler for environment management, Husky for pre-commit hooks
