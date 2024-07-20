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
