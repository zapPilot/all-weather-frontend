// Use Python to calculate upper/lower price back to tick
// Price = token0 / token1, and then calculate your upper price and lower price.
// ```
// import math
// math.log(upper price / (10 ** (18*2 - decimal of token0 - decimal of token 1)), 1.0001)
// ```
class BaseUniswap {
  calculateTokenAmountsForLP(
    depositAmountUSD,
    priceUSDX,
    priceUSDY,
    P,
    Pl,
    Pu,
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

    return [deltaX, deltaY];
  }
  calculateTokenAmountsForLPV2(
    inputToken,
    investmentAmountInThisPosition,
    tokenPricesMappingTable,
    decimalsOfToken0,
    decimalsOfToken1,
    priceUSDX,
    priceUSDY,
    P,
    Pl,
    Pu,
  ) {
    // priceUSDX: token0
    // priceUSDY: token1
    // P = token0 / token1
    const depositAmountUSD =
      tokenPricesMappingTable[inputToken] * investmentAmountInThisPosition;

    const minPrice =
      1.0001 ** this.tickLower *
      10 ** (18 * 2 - decimalsOfToken0 - decimalsOfToken1);
    const maxPrice =
      1.0001 ** this.tickUpper *
      10 ** (18 * 2 - decimalsOfToken0 - decimalsOfToken1);
    const currentPrice =
      tokenPricesMappingTable[this.symbolList[0]] /
        tokenPricesMappingTable[this.symbolList[1]] >
        minPrice &&
      tokenPricesMappingTable[this.symbolList[0]] /
        tokenPricesMappingTable[this.symbolList[1]] <
        maxPrice
        ? tokenPricesMappingTable[this.symbolList[0]] /
          tokenPricesMappingTable[this.symbolList[1]]
        : tokenPricesMappingTable[this.symbolList[1]] /
          tokenPricesMappingTable[this.symbolList[0]];
    assert(currentPrice > minPrice);
    assert(currentPrice < maxPrice);

    const deltaL =
      depositAmountUSD /
      ((Math.sqrt(P) - Math.sqrt(Pl)) * priceUSDY +
        (1 / Math.sqrt(P) - 1 / Math.sqrt(Pu)) * priceUSDX);
    const deltaY = deltaL * (Math.sqrt(P) - Math.sqrt(Pl));
    const deltaX = deltaL * (1 / Math.sqrt(P) - 1 / Math.sqrt(Pu));
    const swapAmountFromInputToToken0 =
      (tokenPricesMappingTable[this.symbolList[0]] * deltaX) /
      tokenPricesMappingTable[inputToken];
    const swapAmountFromInputToToken1 =
      (tokenPricesMappingTable[this.symbolList[1]] * deltaY) /
      tokenPricesMappingTable[inputToken];

    return [swapAmountFromInputToToken0, swapAmountFromInputToToken1];
  }
}

export default BaseUniswap;
