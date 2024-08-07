import BasePage from "../basePage.tsx";
import Link from "next/link";
/*
  This example requires some changes to your config:
  
  ```
  // tailwind.config.js
  module.exports = {
    // ...
    plugins: [
      // ...
      require('@tailwindcss/aspect-ratio'),
    ],
  }
  ```
*/
const products = [
  {
    id: 1,
    portfolioName: "All Weather Portfolio",
    href: "#",
    imageSrc: "/indexFunds/allWeatherPortfolio.png",
    imageAlt: "All Weather Portfolio",
    apr: "35%",
    tvl: "$1000",
  },
  {
    id: 2,
    portfolioName: "Stablecoin Vault",
    href: "#",
    imageSrc: "/indexFunds/allWeatherPortfolio.png",
    imageAlt: "Stablecoin Vault",
    apr: "30%",
    tvl: "$1000",
  },
];

export default function Vaults() {
  return (
    <BasePage>
      <div className="bg-white">
        <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 sm:py-24 lg:max-w-7xl lg:px-8">
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">
            List of Index Funds
          </h2>

          <div className="mt-6 grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4 xl:gap-x-8">
            {products.map((product) => (
              <div key={product.id} className="group relative">
                <div className="aspect-h-1 aspect-w-1 w-full overflow-hidden rounded-md bg-gray-200 lg:aspect-none group-hover:opacity-75 lg:h-80">
                  <img
                    alt={product.imageAlt}
                    src={product.imageSrc}
                    className="h-full w-full object-cover object-center lg:h-full lg:w-full"
                  />
                </div>
                <div className="mt-4 flex justify-between">
                  <div>
                    <h3 className="text-sm text-gray-700">
                      <Link
                        href={{
                          pathname: "/indexes/indexOverviews",
                          query: { portfolioName: product.portfolioName },
                        }}
                      >
                        {product.portfolioName}
                      </Link>
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      TVL: {product.tvl}
                    </p>
                  </div>
                  <p className="text-sm font-medium text-gray-900">
                    APR: {product.apr}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </BasePage>
  );
}
