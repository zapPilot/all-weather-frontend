This is a [RainbowKit](https://rainbowkit.com) + thirdweb + [Next.js](https://nextjs.org/) project bootstrapped with [`create-rainbowkit`](https://github.com/rainbow-me/rainbowkit/tree/main/packages/create-rainbowkit).

## Getting Started

First, `cp .env.sample .env.local` and update the values if needed.

Then:

1. `yarn`
2. `yarn dev`

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `pages/index.tsx`. The page auto-updates as you edit the file.

## Some Routines

1. How do we update Chains/Protocols/Tokens's Pictures? Refer to [public/README.md](public/README.md) please

## Vitest

1. Configuring Vitest: `Vitest` will read your root `vite.config.js` to match with the plugins and setup as your app.
2. Add Vitest Unit Test: Create `__tests__` folder in root. Create `basepage.test.jsx` for example.
3. Running your tests: run `yarn test`.

### Vitest Coverage

1. install @vitest/coverage-v8 `yarn add @vitest/coverage-v8 --dev`
2. Showing your Vitest Coverage : run `yarn coverage`.

## CI/CD

1. [./github/workflows/lint.yaml]: before committing to Github, run `yarn format`. Otherwise, `prettier` would raise an exception
2. [./github/workflows/vitest.yaml]: before committing to Github, run `yarn test`.
3. Fleek: Click this link
   ![fleek](docs/fleek.png)
4. Deployment:
   1. staging(branch `main`): <https://all-weather-protocol-staging.on.fleek.co/>
   2. prod(prod `prod`): <https://all-weather-protocol.on.fleek.co/>

## TO-DO

need a linter like this one <https://github.com/david30907d/all-weather-scaffold/actions/runs/5637981937/job/15271636819>
