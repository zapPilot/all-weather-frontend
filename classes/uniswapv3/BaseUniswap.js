// Use Python to calculate upper/lower price back to tick
// Price = token0 / token1, and then calculate your upper price and lower price.
// ```
// import math
// math.log(upper price / (10 ** (18*2 - decimal of token0 - decimal of token 1)), 1.0001)
// ```
import assert from "assert";
import { ethers } from "ethers";
import CamelotNFTPositionManager from "../../lib/contracts/CamelotNFTPositionManager.json" assert { type: "json" };
import ERC20_ABI from "../../lib/contracts/ERC20.json" assert { type: "json" };
import { PROVIDER } from "../../utils/general.js";
import AlgebraPool from "../../lib/contracts/Camelot/AlgebraPool.json" assert { type: "json" };

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
    console.log(
      "currentPrice",
      currentPrice,
      minPrice,
      maxPrice,
      "price",
      tokenPricesMappingTable[token0Symbol],
      tokenPricesMappingTable[token1Symbol],
    );
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
  // getUncollectedFees() {
  //   // Fetch global fee growth
  //   const feeGrowthGlobal0X128 = BigInt(2035451573126599860634365713953696819624);
  //   const feeGrowthGlobal1X128 = BigInt(684887248557011110098880972824309170);

  //   // Fetch fee growth outside the tick range
  //   // const tickLowerData = await poolContract.ticks(tickLower);
  //   // const tickUpperData = await poolContract.ticks(tickUpper);

  //   const feeGrowthOutsideLower0X128 = BigInt(1038699449216320604781002198732142450014)
  //   const feeGrowthOutsideLower1X128 =  BigInt(511396598114141877833919722086195606)
  //   const feeGrowthOutsideUpper0X128 = BigInt(30521569702293137486123643089129302063)
  //   const feeGrowthOutsideUpper1X128 = BigInt(25634207230629328784956795027271311)

  //   // Compute fee growth inside tick range
  //   const feeGrowthInside0Current = BigInt(feeGrowthGlobal0X128) - BigInt(feeGrowthOutsideLower0X128) - BigInt(feeGrowthOutsideUpper0X128);
  //   const feeGrowthInside1Current = BigInt(feeGrowthGlobal1X128) - BigInt(feeGrowthOutsideLower1X128) - BigInt(feeGrowthOutsideUpper1X128);
  //   const liquidity = BigInt(201776566347547535319)
  //   const feeGrowthInside0LastX128 = BigInt(907177352700173650682376226011207462050)
  //   const feeGrowthInside1LastX128 = BigInt(139679470571880310271850719085624842);
  //   // Compute actual uncollected fees
  //   const fees0 = BigInt(((feeGrowthInside0Current - feeGrowthInside0LastX128) * BigInt(liquidity)) / BigInt(2 ** 128));
  //   const fees1 = BigInt(((feeGrowthInside1Current - feeGrowthInside1LastX128) * BigInt(liquidity)) / BigInt(2 ** 128));

  //   console.log(`Unclaimed Fees: Token0 = ${fees0}, Token1 = ${fees1}`);
  //   return { fees0, fees1 };
  // }
  async getUncollectedFees(token_id, positionManager, poolContract) {
    // Fetch global fee growth
    // const feeGrowthGlobal0X128 = BigInt(2035451573126599860634365713953696819624);
    const position = await positionManager.positions(token_id);
    let fees0 = position.tokensOwed0;
    let fees1 = position.tokensOwed1;

    if (fees0 > 0n || fees1 > 0n) {
      console.log(`Using tokensOwed0: ${fees0}, tokensOwed1: ${fees1}`);
      return { fees0, fees1 }; // Return directly if unclaimed fees are already tracked
    }
    console.log("getUncollectedFees");
    const feeGrowthGlobal0X128 =
      await poolContract.functions.totalFeeGrowth0Token();
    const feeGrowthGlobal1X128 =
      await poolContract.functions.totalFeeGrowth1Token();

    // Fetch fee growth outside the tick range
    console.log("feeGrowthGlobal0X128", feeGrowthGlobal0X128);
    console.log("feeGrowthGlobal1X128", feeGrowthGlobal1X128);

    console.log("position", position);
    const liquidity = position.liquidity;
    const tickLower = position.tickLower;
    const tickUpper = position.tickUpper;
    const feeGrowthInside0LastX128 = position.feeGrowthInside0LastX128;
    const feeGrowthInside1LastX128 = position.feeGrowthInside1LastX128;

    // const feeGrowthOutsideLower0X128 = BigInt(1038699449216320604781002198732142450014)
    console.log("tickLower", tickLower);
    const lowerTicks = await poolContract.functions.ticks(tickLower);
    console.log("lowerTicks", lowerTicks);
    const feeGrowthOutsideLower0X128 = lowerTicks.outerFeeGrowth0Token;
    console.log("feeGrowthOutsideLower0X128", feeGrowthOutsideLower0X128);
    const feeGrowthOutsideLower1X128 = lowerTicks.outerFeeGrowth1Token;
    // const feeGrowthOutsideLower1X128 =  511396598114141877833919722086195606)
    // const feeGrowthOutsideLower1X128 =  511396598114141877833919722086195606)
    const upperTicks = await poolContract.functions.ticks(tickUpper);
    console.log("upperTicks", upperTicks);
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

    console.log(`Unclaimed Fees: Token0 = ${fees0}, Token1 = ${fees1}`);
    return { fees0, fees1 };
  }
  // async calculateLpPrice(poolAddress, tokenPricesMappingTable, tokenMetadata) {
  //   const [[token0Symbol, token0Address, token0Decimals], [token1Symbol, token1Address, token1Decimals]] = tokenMetadata
  //   const poolContractInstance = new ethers.Contract(poolAddress, AlgebraPool, PROVIDER(this.chain))
  //   console.log("poolAddress", poolAddress)
  //   const liquidity = (await poolContractInstance.liquidity())
  //   console.log("liquidity", liquidity)
  //   const token0Price = tokenPricesMappingTable[token0Symbol]
  //   const token1Price = tokenPricesMappingTable[token1Symbol]
  //   console.log("token0Price", token0Price)
  //   console.log("token1Price", token1Price)
  //   const token0Reserve = (await new ethers.Contract(token0Address, ERC20_ABI, PROVIDER(this.chain)).balanceOf(poolAddress)) / 10 ** token0Decimals
  //   const token1Reserve = (await new ethers.Contract(token1Address, ERC20_ABI, PROVIDER(this.chain)).balanceOf(poolAddress)) / 10 ** token1Decimals
  //   console.log("token0Reserve", token0Reserve)
  //   console.log("token1Reserve", token1Reserve)
  //   return (token0Price * token0Reserve + token1Price * token1Reserve) / liquidity
  // }
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
    console.log("tickLower", tickLower);
    console.log("tickUpper", tickUpper);
    console.log("liquidity", liquidity);

    // Fetch current price from the pool
    const slot0 = await poolContract.globalState();
    const sqrtPriceX96 = slot0.price;
    console.log("sqrtPriceX96", sqrtPriceX96);
    // Convert price to decimal
    const P = Number(sqrtPriceX96) ** 2 / 2 ** 192;
    const P_upper = 1.0001 ** tickUpper;
    const P_lower = 1.0001 ** tickLower;
    console.log("P_upper", P_upper);
    console.log("P_lower", P_lower);
    // Calculate token0 and token1 amounts
    const amount0 =
      (liquidity * (Math.sqrt(P_upper) - Math.sqrt(P))) /
      (Math.sqrt(P) * Math.sqrt(P_upper));
    const amount1 = liquidity * (Math.sqrt(P) - Math.sqrt(P_lower));
    console.log("amount0", amount0);
    console.log("amount1", amount1);
    // Fetch token prices from Chainlink or Uniswap
    const priceToken0 = tokenPricesMappingTable[token0Symbol];
    const priceToken1 = tokenPricesMappingTable[token1Symbol];
    console.log("priceToken0", priceToken0);
    console.log("priceToken1", priceToken1);
    // Convert to USD
    const valueToken0 = amount0 * priceToken0;
    const valueToken1 = amount1 * priceToken1;
    console.log("valueToken0", valueToken0);
    console.log("valueToken1", valueToken1);
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
