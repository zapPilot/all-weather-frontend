import { approve } from "../../utils/general";

class BaseBridge {
  sdk: any;
  requiresInit: boolean;
  isInitialized: boolean = false;

  constructor(public name: string, requiresInit: boolean = true) {
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
  ): Promise<[any, any] | []> {
    try {
      const [customBridgeTxn, bridgeAddress] = await this.customBridgeTxn(
        owner,
        fromChainId,
        toChainId,
        fromToken,
        toToken,
        amount,
        updateProgress,
      );
      const approveTxn = approve(
        fromToken,
        bridgeAddress,
        amount,
        updateProgress,
        fromChainId,
      );

      return [approveTxn, customBridgeTxn];
    } catch (error) {
      console.error("Error in getBridgeTxns:", error);
      return [];
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
  ): Promise<[any, any, string]> {
    // Implementation
    throw new Error("Method 'customBridgeTxn()' must be implemented.");
  }

  async fetchFeeCosts(
    account: string,
    fromChainId: number,
    toChainId: number,
    inputToken: string,
    targetToken: string,
    inputAmount: string,
    tokenPrices: number,
  ): Promise<string | null> {
    throw new Error("Method 'fetchFeeCosts()' must be implemented.");
  }
}

export default BaseBridge;
