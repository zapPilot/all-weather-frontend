import { approve } from "../../utils/general";

class BaseBridge {
  sdk: any;
  requiresInit: boolean;
  isInitialized: boolean = false;
  maxBridgeDuration: number = 60;
  constructor(
    public name: string,
    requiresInit: boolean = true,
  ) {
    this.requiresInit = requiresInit;
  }

  needsInit(): boolean {
    return this.requiresInit;
  }

  async init(): Promise<void> {
    if (!this.isInitialized && this.sdk && this.sdk.init) {
      await this.sdk.init();
      this.isInitialized = true;
    }
  }

  async getBridgeTxns(
    owner: string,
    fromChainId: string,
    toChainId: string,
    fromToken: string,
    toToken: string,
    amount: string,
    updateProgress: any,
    tokenPrices: number,
  ): Promise<[any, any] | []> {
    try {
      const [customBridgeTxn, bridgeAddress, feeInUSD] =
        await this.customBridgeTxn(
          owner,
          fromChainId,
          toChainId,
          fromToken,
          toToken,
          amount,
          updateProgress,
          tokenPrices,
        );
      const approveTxn = approve(
        fromToken,
        bridgeAddress,
        amount,
        updateProgress,
        fromChainId,
      );

      return [[approveTxn, customBridgeTxn], feeInUSD];
    } catch (error) {
      console.error("Error in getBridgeTxns:", error);
      return [[], Infinity];
    }
  }

  async customBridgeTxn(
    owner: string,
    fromChainId: string,
    toChainId: string,
    fromToken: string,
    toToken: string,
    amount: string,
    updateProgress: CallableFunction,
    tokenPrices: number,
  ): Promise<[any, any, string]> {
    // Implementation
    throw new Error("Method 'customBridgeTxn()' must be implemented.");
  }
  async getFeeCosts(
    quote: any,
    tokenPrices: number,
    fromToken: string,
    fromChainId: string,
  ) {
    throw new Error("Method 'getFeeCosts()' must be implemented.");
  }
}

export default BaseBridge;
