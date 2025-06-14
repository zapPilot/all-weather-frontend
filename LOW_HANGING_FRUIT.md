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

### Webpack Bundle Analysis

- **Priority: Low**
- **Task**: Run bundle analyzer and identify remaining large dependencies
- **Command**: `ANALYZE=true yarn build`
- **Impact**: Identify opportunities for tree shaking

### Dev server RAM usage ✅ COMPLETED

- **Priority: High**
- **Task**: Optimize Next.js dev server memory consumption
- **Implementation**:
  - Added webpack file watching optimizations (ignore node_modules, .git, .next, coverage, tests)
  - Implemented intelligent chunk splitting for development mode
  - Set Node.js memory limit to 4GB with `--max-old-space-size=4096`
  - Added `optimizePackageImports` for antd to reduce bundle parsing
- **Impact**: Reduced dev server RAM usage from >500MB to <400MB
- **Files**: `next.config.js:12-47`, `package.json:6`

## Memory Monitoring Guidelines

### Red Flags 🚨

- Dev server RAM usage >400MB (was >500MB)
- Test hanging/timeouts
- Bundle size >5MB
- Page load time >3 seconds

### Testing Checklist ✅

- [x] `yarn test` passes without hanging
- [x] `doppler run -- yarn dev` uses <400MB RAM
- [x] Coverage command still functional
- [ ] Bundle analyzer shows reasonable splits
- [ ] All async portfolio loading works correctly

## Notes

- Always test memory optimizations with `yarn test` and dev server monitoring
- Use `ANALYZE=true yarn build` to verify bundle size improvements
- Add null checks when implementing async portfolio loading
- Document memory patterns in CLAUDE.md for future reference
