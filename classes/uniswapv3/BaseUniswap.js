// Base class without a constructor
class BaseUniswap {
  calculateTokenAmountsForLP(
    depositAmountUSD,
    priceUSDX,
    priceUSDY,
    P,
    Pl,
    Pu,
  ) {
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
