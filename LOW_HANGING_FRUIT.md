# LOW HANGING FRUIT - Performance Optimization Tasks

## Next Performance Improvements 🎯

### Bundle Size Optimization

- **Priority: High**
- **Task**: Implement code splitting for protocol-specific components
- **Impact**: Further reduce initial load time
- **Files**: `pages/indexes/indexOverviews.jsx`, protocol-specific tabs

### Image Optimization

- **Priority: Medium**
- **Task**: Implement WebP conversion and lazy loading for chain/protocol images
- **Impact**: Faster page load, reduced bandwidth
- **Files**: `public/` assets, `ImageWithFallback.jsx`

### API Call Optimization

- **Priority: Medium**
- **Task**: Implement request batching and caching for portfolio calculations
- **Impact**: Reduced API calls, faster data loading
- **Files**: `utils/portfolioCalculation.js`, token price services

### State Management Optimization

- **Priority: Low**
- **Task**: Migrate from Redux to Zustand for lighter state management
- **Impact**: Smaller bundle size, better performance
- **Files**: Redux store files, component connections

### Smart Contract ABI Optimization ✅ COMPLETED

- **Priority: High** 
- **Task**: Replace large complete ABIs with minimal ABIs containing only used functions
- **Implementation**:
  - **CRITICAL**: Reduced PermanentPortfolioLPToken.json from 112KB to ~1KB (ERC20_Minimal.json)
  - **MAJOR**: Reduced ActionAddRemoveLiqV3.json from 63KB to 15KB (ActionAddRemoveLiqV3-minimal.json)
  - Created lib/contracts/minimal/ directory for optimized ABIs
  - Updated imports in utils/general.js and Pendle protocol classes
- **Impact**: Saved ~160KB of unused ABI functions (~85% reduction)
- **Files**: 
  - `lib/contracts/minimal/ERC20_Minimal.json` (new)
  - `lib/contracts/Pendle/ActionAddRemoveLiqV3-minimal.json` (new)
  - `utils/general.js`, `classes/Pendle/BaseEquilibria.js`, `classes/Pendle/BasePendlePT.js`

### BasePortfolio Memory Optimization

- **Priority: Medium**
- **Task**: Break down large BasePortfolio.jsx (50KB) into smaller focused modules
- **Impact**: Reduce memory footprint of portfolio calculations and prevent memory leaks
- **Implementation**:
  - Split portfolio calculation logic into separate utilities
  - Extract event emitter patterns to prevent memory leaks
  - Implement lazy loading for protocol-specific calculations
  - Move heavy data structures out of main component
- **Files**: `classes/BasePortfolio.jsx`, `utils/portfolioCalculation.js`

### Webpack Bundle Analysis

- **Priority: Medium**
- **Task**: Run bundle analyzer and identify remaining large dependencies
- **Command**: `ANALYZE=true yarn build`
- **Impact**: Identify opportunities for tree shaking

### Dev server RAM usage ✅ COMPLETED (ENHANCED)

- **Priority: High**
- **Task**: Optimize Next.js dev server memory consumption
- **Implementation**:
  - **CRITICAL**: Removed 13.5MB `tokens.json` file that was causing memory bloat
  - Added webpack file watching optimizations (ignore node_modules, .git, .next, coverage, tests)
  - Implemented intelligent chunk splitting for development mode
  - Set Node.js memory limit to 4GB with `--max-old-space-size=4096`
  - Added `optimizePackageImports` for antd to reduce bundle parsing
  - **NEW**: Implemented aggressive lazy loading for tab components (ZapInTab, ZapOutTab, etc.)
  - **NEW**: Added Suspense wrappers for APRComposition and heavy UI components
- **Impact**: Reduced dev server RAM usage from >500MB to <350MB (~30% reduction)
- **Files**:
  - `next.config.js:12-47`, `package.json:6`
  - `hooks/useTabItems.jsx` (lazy loading implementation)
  - Removed: `pages/views/components/tokens.json` (13.5MB freed)

## Memory Monitoring Guidelines

### Red Flags 🚨

- Dev server RAM usage >350MB (was >500MB, now optimized to <350MB)
- Test hanging/timeouts
- Bundle size >5MB
- Page load time >3 seconds
- Large data files >1MB in components/ or pages/
- Eager imports of heavy components in critical path

### Testing Checklist ✅

- [x] `yarn test` passes without hanging (322 tests pass)
- [x] `doppler run -- yarn dev` uses <350MB RAM (down from >500MB)
- [x] Coverage command still functional
- [x] Tab components load lazily with Suspense fallbacks
- [x] Large tokens.json file removed (13.5MB freed)
- [x] Smart contract ABIs optimized (~160KB saved from minimal ABIs)
- [ ] Bundle analyzer shows reasonable splits
- [ ] All async portfolio loading works correctly
- [ ] BasePortfolio memory optimization implemented

## Notes

- Always test memory optimizations with `yarn test` and dev server monitoring
- Use `ANALYZE=true yarn build` to verify bundle size improvements
- Add null checks when implementing async portfolio loading
- Document memory patterns in CLAUDE.md for future reference
