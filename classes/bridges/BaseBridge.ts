import { approve } from "../../utils/general";

class BaseBridge {
  sdk: any;
  constructor(public name: string) {}
  async getBridgeTxns(
    owner: string,
    fromChainId: string,
    toChainId: string,
    fromToken: string,
    toToken: string,
    amount: string,
    updateProgress: any,
  ): Promise<[any, any]> {
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
}

export default BaseBridge;
