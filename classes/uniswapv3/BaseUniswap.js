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
    token1Price,
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
      ethers.utils.parseUnits(
        (deltaX * token0Price).toFixed(18).toString(),
        18,
      ),
      ethers.utils.parseUnits(
        (deltaY * token1Price).toFixed(18).toString(),
        18,
      ),
    ];
  }
  _calculateTokenAmountsForUniswapV3LP(
    tokenMetadatas,
    tickers,
    tokenPricesMappingTable,
  ) {
    // P = token0 / token1
    const placeholderDepositAmount = 1000;
    const { tickLower, tickUpper } = tickers;
    const [
      [token0Symbol, token0Address, token0Decimals],
      [token1Symbol, token1Address, token1Decimals],
    ] = tokenMetadatas;
    const P =
      tokenPricesMappingTable[token0Symbol] /
      tokenPricesMappingTable[token1Symbol];
    const priceUSDX = tokenPricesMappingTable[token0Symbol];
    const priceUSDY = tokenPricesMappingTable[token1Symbol];
    const minPrice =
      1.0001 ** tickLower * 10 ** (18 * 2 - token0Decimals - token1Decimals);
    const maxPrice =
      1.0001 ** tickUpper * 10 ** (18 * 2 - token0Decimals - token1Decimals);
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
  async getWithdrawalAmounts(
    token_id,
    positionManager,
    poolContract,
    liquidityToRemove,
  ) {
    const position = await positionManager.positions(token_id);
    const { tickLower, tickUpper } = position;

    // Fetch current price from the pool
    const slot0 = await poolContract.globalState();
    const sqrtPriceX96 = slot0.price;
    // Convert price to decimal
    const P = Number(sqrtPriceX96) ** 2 / 2 ** 192;
    const P_upper = 1.0001 ** tickUpper;
    const P_lower = 1.0001 ** tickLower;
    // Calculate token0 and token1 amounts
    const amount0 =
      (liquidityToRemove * (Math.sqrt(P_upper) - Math.sqrt(P))) /
      (Math.sqrt(P) * Math.sqrt(P_upper));
    const amount1 = liquidityToRemove * (Math.sqrt(P) - Math.sqrt(P_lower));
    return { amount0, amount1 };
  }

  async getUncollectedFees(token_id, positionManager, poolContract) {
    // Fetch global fee growth
    // const feeGrowthGlobal0X128 = BigInt(2035451573126599860634365713953696819624);
    const position = await positionManager.positions(token_id);
    let fees0 = position.tokensOwed0;
    let fees1 = position.tokensOwed1;

    if (fees0 > 0n || fees1 > 0n) {
      return { fees0, fees1 }; // Return directly if unclaimed fees are already tracked
    }
    const feeGrowthGlobal0X128 =
      await poolContract.functions.totalFeeGrowth0Token();
    const feeGrowthGlobal1X128 =
      await poolContract.functions.totalFeeGrowth1Token();

    // Fetch fee growth outside the tick range

    const liquidity = position.liquidity;
    const tickLower = position.tickLower;
    const tickUpper = position.tickUpper;
    const feeGrowthInside0LastX128 = position.feeGrowthInside0LastX128;
    const feeGrowthInside1LastX128 = position.feeGrowthInside1LastX128;

    // const feeGrowthOutsideLower0X128 = BigInt(1038699449216320604781002198732142450014)
    const lowerTicks = await poolContract.functions.ticks(tickLower);
    const feeGrowthOutsideLower0X128 = lowerTicks.outerFeeGrowth0Token;
    const feeGrowthOutsideLower1X128 = lowerTicks.outerFeeGrowth1Token;
    // const feeGrowthOutsideLower1X128 =  511396598114141877833919722086195606)
    // const feeGrowthOutsideLower1X128 =  511396598114141877833919722086195606)
    const upperTicks = await poolContract.functions.ticks(tickUpper);
    const feeGrowthOutsideUpper0X128 = upperTicks.outerFeeGrowth0Token;
    const feeGrowthOutsideUpper1X128 = upperTicks.outerFeeGrowth1Token;
    // const feeGrowthOutsideUpper0X128 = 30521569702293137486123643089129302063)
    // const feeGrowthOutsideUpper1X128 = 25634207230629328784956795027271311)

    // Compute fee growth inside tick range

    const feeGrowthInside0Current =
      feeGrowthGlobal0X128 -
      feeGrowthOutsideLower0X128 -
      feeGrowthOutsideUpper0X128;
    const feeGrowthInside1Current =
      feeGrowthGlobal1X128 -
      feeGrowthOutsideLower1X128 -
      feeGrowthOutsideUpper1X128;
    // Compute actual uncollected fees
    fees0 =
      ((feeGrowthInside0Current - feeGrowthInside0LastX128) * liquidity) /
      2 ** 128;
    fees1 =
      ((feeGrowthInside1Current - feeGrowthInside1LastX128) * liquidity) /
      2 ** 128;
    return { fees0, fees1 };
  }
  async getNFTValue(
    tokenId,
    poolContract,
    positionManager,
    tokenPricesMappingTable,
    token0Symbol,
    token1Symbol,
  ) {
    const position = await positionManager.positions(tokenId);
    const { tickLower, tickUpper, liquidity } = position;

    // Fetch current price from the pool
    const slot0 = await poolContract.globalState();
    const sqrtPriceX96 = slot0.price;
    // Convert price to decimal
    const P = Number(sqrtPriceX96) ** 2 / 2 ** 192;
    const P_upper = 1.0001 ** tickUpper;
    const P_lower = 1.0001 ** tickLower;
    // Calculate token0 and token1 amounts
    const amount0 =
      (liquidity * (Math.sqrt(P_upper) - Math.sqrt(P))) /
      (Math.sqrt(P) * Math.sqrt(P_upper));
    const amount1 = liquidity * (Math.sqrt(P) - Math.sqrt(P_lower));
    // Fetch token prices from Chainlink or Uniswap
    const priceToken0 = tokenPricesMappingTable[token0Symbol];
    const priceToken1 = tokenPricesMappingTable[token1Symbol];
    // Convert to USD
    const valueToken0 = amount0 * priceToken0;
    const valueToken1 = amount1 * priceToken1;
    return (valueToken0 + valueToken1) / 10 ** 18;
  }
  getPositionKey(owner, tickLower, tickUpper) {
    return ethers.utils.keccak256(
      ethers.utils.solidityPack(
        ["address", "int24", "int24"],
        [owner, tickLower, tickUpper],
      ),
    );
  }
}

export default BaseUniswap;
