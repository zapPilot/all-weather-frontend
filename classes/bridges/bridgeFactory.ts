import AcrossBridge from "./across";
import BaseBridge from "./BaseBridge";
import SquidBridge from "./squid";

type BridgeConstructor = new () => AcrossBridge | SquidBridge | BaseBridge;
// const BRIDGE_REGISTRY: BridgeConstructor[] = [AcrossBridge, SquidBridge];
// sometimes squid would fail
const BRIDGE_REGISTRY: BridgeConstructor[] = [AcrossBridge];

async function getTheBestBridgeTxns(
  account: string,
  fromChainId: number,
  toChainId: number,
  inputToken: string,
  targetToken: string,
  inputAmount: string,
  tokenPrices: number,
  updateProgress: (progress: number) => void,
) {
  const bridgeResults = await Promise.all(
    BRIDGE_REGISTRY.map(async (BridgeClass) => {
      const bridge = new BridgeClass();
      await bridge.init();
      const [txns, feeCostsInUSD] = await bridge.getBridgeTxns(
        account,
        fromChainId.toString(),
        toChainId.toString(),
        inputToken,
        targetToken,
        inputAmount,
        updateProgress,
        tokenPrices,
      );
      return { bridge, feeCostsInUSD, txns };
    }),
  );

  const validBridges = bridgeResults.filter(
    (result) => result.feeCostsInUSD !== Infinity && result.txns !== undefined,
  );
  if (validBridges.length === 0) {
    throw new Error("No available bridges found");
  }

  validBridges.sort((a, b) => a.feeCostsInUSD - b.feeCostsInUSD);
  return validBridges[0].txns;
}

export default getTheBestBridgeTxns;
