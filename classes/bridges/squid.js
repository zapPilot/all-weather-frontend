import logger from "../../utils/logger";
import BaseBridge from "./BaseBridge";
import { Squid } from "@0xsquid/sdk";
import { CHAIN_ID_TO_CHAIN, PROVIDER } from "../../utils/general";
import THIRDWEB_CLIENT from "../../utils/thirdweb";
import { ethers } from "ethers";
import ERC20 from "../../lib/contracts/ERC20.json";

class SquidBridge extends BaseBridge {
  constructor() {
    super("squid", true);
    this.sdk = new Squid({
      baseUrl: "https://v2.api.squidrouter.com/",
      integratorId: process.env.NEXT_PUBLIC_INTEGRATOR_ID,
    });
    this.squidRouterContract = "0xce16F69375520ab01377ce7B88f5BA8C48F8D666";
    this.isInitialized = false;
  }

  async delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async getRoute(params) {
    const { route } = await this.sdk.getRoute(params);
    return route;
  }

  async customBridgeTxn(
    owner,
    fromChainId,
    toChainId,
    fromToken,
    toToken,
    amount,
    updateProgress,
  ) {
    const maxRetries = 3;
    let retryCount = 0;

    while (retryCount < maxRetries) {
      try {
        const routeParams = {
          fromAddress: owner,
          fromChain: fromChainId.toString(),
          fromToken: fromToken,
          fromAmount: amount.toString(),
          toChain: toChainId.toString(),
          toToken: toToken,
          toAddress: owner,
          slippage: 1,
          enableForecall: false,
          quoteOnly: false,
        };

        const route = await this.getRoute(routeParams);
        if (route.estimate.estimatedRouteDuration > this.maxBridgeDuration) {
          logger.log(
            "Route duration is greater than maxBridgeDuration. Returning Infinity.",
          );
          // the unit is seconds
          return [undefined, undefined, Infinity];
        }
        const { feeInUSD } = await this.getFeeCosts(
          route,
          fromToken,
          fromChainId,
        );
        updateProgress(`bridge-${fromChainId}-${toChainId}`, -Number(feeInUSD));

        const bridgeTxn = {
          client: THIRDWEB_CLIENT,
          to: route.transactionRequest.target,
          chain: CHAIN_ID_TO_CHAIN[fromChainId],
          data: route.transactionRequest.data,
          value: route.transactionRequest.value,
          gasLimit: route.transactionRequest.gasLimit,
          maxFeePerGas: route.transactionRequest.maxFeePerGas,
          maxPriorityFeePerGas: route.transactionRequest.maxPriorityFeePerGas,
        };

        const bridgeAddress = route.transactionRequest.target;
        return [bridgeTxn, bridgeAddress, feeInUSD];
      } catch (error) {
        logger.error(`Attempt ${retryCount + 1} failed:`, error);
        retryCount++;

        if (retryCount < maxRetries) {
          const waitTime = 3000;
          logger.log(`Retrying in ${waitTime / 1000} seconds...`);
          await this.delay(waitTime);
          continue;
        }
        throw error;
      }
    }
  }

  async getTokenDecimals(tokenAddress, chainId) {
    // Check if it's native ETH (either 0xeeee... or zero address)
    if (
      tokenAddress?.toLowerCase() ===
        "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee" ||
      tokenAddress?.toLowerCase() ===
        "0x0000000000000000000000000000000000000000"
    ) {
      return 18;
    }

    const tokenInstance = new ethers.Contract(
      tokenAddress,
      ERC20,
      PROVIDER(
        CHAIN_ID_TO_CHAIN[chainId].name
          .replace(" one", "")
          .replace(" mainnet", ""),
      ),
    );
    return await tokenInstance.decimals();
  }

  calculateFeeInToken(fee, decimals) {
    return ethers.utils.formatUnits(fee, decimals);
  }

  async getFeeCosts(route, fromToken, fromChainId) {
    const tokenDecimals = await this.getTokenDecimals(
      route.estimate?.feeCosts[0]?.token.address,
      fromChainId,
    );
    const fee = route.estimate?.feeCosts[0]?.amount;
    const feeInToken = this.calculateFeeInToken(fee, tokenDecimals);
    const tokenPrice = route.estimate?.feeCosts[0]?.token.usdPrice;
    const feeInUSD = feeInToken * tokenPrice;
    return { fee, feeInUSD };
  }
}

export default SquidBridge;
