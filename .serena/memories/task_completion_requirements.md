# Task Completion Requirements

## Mandatory Pre-Commit Steps

1. **Code Formatting**: Run `yarn format` (Prettier + Black formatting)
2. **Linting**: Run `yarn lint` to fix ESLint issues automatically
3. **Testing**: Run `yarn test` to ensure all tests pass
4. **Coverage**: Verify test coverage meets thresholds (75% lines, 63% functions, 86% branches)

## Testing Requirements

- **Framework**: Vitest with jsdom environment
- **Setup**: Uses `vitest.setup.js` for test configuration
- **Timeout**: 140 seconds for test execution
- **Coverage Thresholds**:
  - Lines: 75%
  - Functions: 63%
  - Branches: 86%
  - Statements: 75%

## Code Quality Checks

- **ESLint**: Must pass with Next.js core-web-vitals configuration
- **TypeScript**: Must compile without errors
- **Prettier**: Code must be formatted according to .prettierignore rules

## Environment Validation

- **Environment Files**: Ensure `.env.local` is properly configured
- **Dependencies**: Verify `yarn` install completed successfully
- **Build**: Confirm `yarn build` succeeds before deployment

## Memory Optimization Validation

- **RAM Usage**: Verify dev server uses <350MB RAM
- **Bundle Size**: Check with `ANALYZE=true yarn build` when adding dependencies
- **ABI Sizes**: Ensure smart contract ABIs are minimal versions

## Git Workflow

- **Branch Strategy**: Use feature branches, staging on `main`, production on `prod`
- **Commit Messages**: Clear, descriptive commit messages
- **Pre-commit Hooks**: Husky automatically runs formatting and linting
