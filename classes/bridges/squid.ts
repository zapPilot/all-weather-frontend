import { Squid } from "@0xsquid/sdk"; // Import Squid SDK
import BaseBridge from "./BaseBridge";
import { prepareTransaction } from "thirdweb";
import THIRDWEB_CLIENT from "../../utils/thirdweb";
import { CHAIN_ID_TO_CHAIN } from "../../utils/general";
class SquidBridge extends BaseBridge {
  sdk: Squid; // Declare the sdk property

  constructor() {
    super("squid");
    this.sdk = new Squid({
      baseUrl: "https://apiplus.squidrouter.com",
      integratorId: process.env.NEXT_PUBLIC_INTEGRATOR_ID!,
    });
    // await this.sdk.init();
  }
  async init() {
    await this.sdk.init();
  }
  async customBridgeTxn(
    owner: string,
    fromChainId: string,
    toChainId: string,
    fromToken: string,
    toToken: string,
    amount: string,
  ): Promise<[any, string, string | undefined]> {
    const params = {
      fromAddress: owner,
      fromChain: String(fromChainId),
      fromToken: fromToken,
      fromAmount: amount,
      toChain: String(toChainId),
      toToken: toToken,
      toAddress: owner,
      enableBoost: true,
    };

    console.log("Parameters:", params); // Printing the parameters for QA

    // Get the swap route using Squid SDK
    const { route, requestId } = await this.sdk.getRoute(params);
    const bridgeAddress = route?.transactionRequest?.target;
    const bridgeTxn = prepareTransaction({
      to: bridgeAddress,
      chain: CHAIN_ID_TO_CHAIN[fromChainId],
      client: THIRDWEB_CLIENT,
      data: route?.transactionRequest?.data,
    });
    return [bridgeTxn, requestId, bridgeAddress];
  }
}

export default SquidBridge;
