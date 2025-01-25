// Use Python to calculate upper/lower price back to tick
// Price = token0 / token1, and then calculate your upper price and lower price.
// ```
// import math
// math.log(upper price / (10 ** (18*2 - decimal of token0 - decimal of token 1)), 1.0001)
// ```
import assert from "assert";
import { ethers } from "ethers";


class BaseUniswap {
  calculateUniswapV3LP(
    depositAmountUSD,
    priceUSDX,
    priceUSDY,
    P,
    Pl,
    Pu,
    token0Price,
    token1Price
  ) {
    // priceUSDX: token0
    // priceUSDY: token1
    // P = token0 / token1
    const deltaL =
      depositAmountUSD /
      ((Math.sqrt(P) - Math.sqrt(Pl)) * priceUSDY +
        (1 / Math.sqrt(P) - 1 / Math.sqrt(Pu)) * priceUSDX);
    const deltaY = deltaL * (Math.sqrt(P) - Math.sqrt(Pl));
    const deltaX = deltaL * (1 / Math.sqrt(P) - 1 / Math.sqrt(Pu));

    return [
      ethers.utils.parseUnits((deltaX * token0Price).toFixed(18).toString(), 18),
      ethers.utils.parseUnits((deltaY * token1Price).toFixed(18).toString(), 18)
    ];
  }
  _calculateTokenAmountsForUniswapV3LP(
    tokenMetadatas,
    tickers,
    tokenPricesMappingTable,
  ) {
    // P = token0 / token1
    const placeholderDepositAmount = 1000
    const { tickLower, tickUpper } = tickers;
    const [[token0Symbol, token0Address, token0Decimals], [token1Symbol, token1Address, token1Decimals]] = tokenMetadatas;
    const P = tokenPricesMappingTable[token0Symbol] / tokenPricesMappingTable[token1Symbol]
    const priceUSDX = tokenPricesMappingTable[token0Symbol]
    const priceUSDY = tokenPricesMappingTable[token1Symbol]
    const minPrice =
      1.0001 ** tickLower *
      10 ** (18 * 2 - token0Decimals - token1Decimals);
    const maxPrice =
      1.0001 ** tickUpper *
      10 ** (18 * 2 - token0Decimals - token1Decimals);
    const currentPrice =
      tokenPricesMappingTable[token0Symbol] /
        tokenPricesMappingTable[token1Symbol] >
        minPrice &&
      tokenPricesMappingTable[token0Symbol] /
        tokenPricesMappingTable[token1Symbol] <
        maxPrice
        ? tokenPricesMappingTable[token0Symbol] /
          tokenPricesMappingTable[token1Symbol]
        : tokenPricesMappingTable[token1Symbol] /
          tokenPricesMappingTable[token0Symbol];
    console.log("currentPrice", currentPrice, minPrice, maxPrice, "price", tokenPricesMappingTable[token0Symbol], tokenPricesMappingTable[token1Symbol])
    assert(currentPrice > minPrice);
    assert(currentPrice < maxPrice);

    const deltaL =
    placeholderDepositAmount /
      ((Math.sqrt(P) - Math.sqrt(Pl)) * priceUSDY +
        (1 / Math.sqrt(P) - 1 / Math.sqrt(Pu)) * priceUSDX);
    const deltaY = deltaL * (Math.sqrt(P) - Math.sqrt(Pl));
    const deltaX = deltaL * (1 / Math.sqrt(P) - 1 / Math.sqrt(Pu));
    const swapAmountFromInputToToken0 =
      (tokenPricesMappingTable[token0Symbol] * deltaX) /
      tokenPricesMappingTable[inputToken];
    const swapAmountFromInputToToken1 =
      (tokenPricesMappingTable[token1Symbol] * deltaY) /
      tokenPricesMappingTable[inputToken];

    return [swapAmountFromInputToToken0, swapAmountFromInputToToken1];
  }
}

export default BaseUniswap;
