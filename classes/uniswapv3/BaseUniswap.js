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
    deltaL =
      depositAmountUSD /
      ((math.sqrt(P) - math.sqrt(Pl)) * priceUSDY +
        (1 / math.sqrt(P) - 1 / math.sqrt(Pu)) * priceUSDX);
    deltaY = deltaL * (math.sqrt(P) - math.sqrt(Pl));
    deltaX = deltaL * (1 / math.sqrt(P) - 1 / math.sqrt(Pu));
    return [deltaX, deltaY];
  }
}

export default BaseUniswap;
