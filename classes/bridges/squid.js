import BaseBridge from "./BaseBridge";
import { Squid } from "@0xsquid/sdk";
import { CHAIN_ID_TO_CHAIN, PROVIDER } from "../../utils/general";
import { ethers } from "ethers";
import THIRDWEB_CLIENT from "../../utils/thirdweb";
import { getContract, prepareContractCall } from "thirdweb";
import SpokePool from "../../lib/contracts/Squid/SpokePool.json";
import ERC20 from "../../lib/contracts/ERC20.json";

class SquidBridge extends BaseBridge {
  constructor() {
    super("squid");
    this.sdk = new Squid({
      baseUrl: "https://apiplus.squidrouter.com",
      integratorId: process.env.NEXT_PUBLIC_INTEGRATOR_ID,
    });
    this.squidRouterContract = "0xce16F69375520ab01377ce7B88f5BA8C48F8D666";
  }

  async init() {
    try {
      await this.sdk.init();
    } catch (error) {
      console.error("Failed to initialize Squid SDK:", error);
      throw error;
    }
  }

  async customBridgeTxn(owner, fromChainId, toChainId, fromToken, toToken, amount, updateProgress) {
    try {
      // amount must be string
      const fromChainIdString = fromChainId.toString();
      const toChainIdString = toChainId.toString();
      const amountString = amount.toString();
      const { route } = await this.sdk.getRoute({
        fromAddress: owner,
        fromChain: fromChainIdString,
        fromToken: fromToken,
        fromAmount: amountString,
        toChain: toChainIdString,
        toToken: toToken,
        toAddress: owner,
        slippage: 1,
        enableForecall: true
      });

      console.log("route", route);

      const tokenInstance = new ethers.Contract(
        fromToken,
        ERC20,
        PROVIDER(
          CHAIN_ID_TO_CHAIN[fromChainId].name
            .replace(" one", "")
            .replace(" mainnet", ""),
        ),
      );
      const tokenDecimals = await tokenInstance.decimals();
      console.log("tokenDecimals", tokenDecimals);

      const spokePoolContract = getContract({
        client: THIRDWEB_CLIENT,
        address: this.squidRouterContract,
        chain: CHAIN_ID_TO_CHAIN[fromChainId],
        abi: SpokePool,
      });

      const fillDeadlineBuffer = 18000;
      const fillDeadline = Math.round(Date.now() / 1000) + fillDeadlineBuffer;
      const fee = route.estimate?.feeCosts?.[0]?.amountUsd;
      updateProgress(
        `bridge-${fromChainId}-${toChainId}`,
        -Number(fee),
      );

      const bridgeTxn = prepareContractCall({
        contract: spokePoolContract,
        method: "bridgeCall",
        params: [
          route.estimate.toToken.symbol,
          route.estimate.fromAmount,
          route.params.toChain,
          owner,
          route.transactionRequest.data,
          owner,
          false,          
        ],
        extraGas: 50000n,
      });

      console.log("bridgeTxn", bridgeTxn);

      return [bridgeTxn, this.squidRouterContract];
    } catch (error) {
      console.error('Error in Squid bridge:', error);
      throw error;
    }
  }
}

export default SquidBridge;
