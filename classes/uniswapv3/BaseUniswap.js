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
}

export default BaseUniswap;
