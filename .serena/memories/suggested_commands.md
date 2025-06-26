# Suggested Development Commands

## Essential Commands

```bash
yarn                          # Install dependencies
doppler run -- yarn dev      # Start development server (requires .env.local config)
yarn build                   # Build for production
yarn start                   # Start production server
```

## Code Quality & Testing

```bash
yarn lint                    # Run ESLint with auto-fix
yarn format                  # Format code with Prettier and Black (enforced pre-commit)
yarn check-format            # Check formatting without changes
yarn test                    # Run Vitest tests (140s timeout)
yarn test-ui                 # Start Vitest UI at http://localhost:51204/__vitest__/
yarn coverage                # Run test coverage report (75% threshold)
```

## Environment Setup

```bash
cp .env.sample .env.local     # Copy environment template
# Edit .env.local with required values
# Doppler is used for environment variable management
```

## Development Tips

- Environment requires Doppler for proper configuration
- Pre-commit hooks enforce `yarn format` before commits
- Memory optimization target: <350MB RAM during development
- Use `TEST=true` environment variable for test-specific behavior
- Comment out `loading={zapInIsLoading}` in ZapInTab.jsx for faster testing

## System Commands (Darwin/macOS)

```bash
ls                           # List directory contents
find . -name "*.js"          # Search for files
grep -r "pattern" .          # Search in files
git status                   # Check git status
git log --oneline -10        # View recent commits
```
