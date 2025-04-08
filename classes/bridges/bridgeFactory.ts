import AcrossBridge from "./across";
import SquidBridge from "./squid";
interface BridgeInfo {
  bridge: AcrossBridge | SquidBridge;
  fee: string | null;
  isAvailable: boolean;
  error?: string;
}
type BridgeConstructor = new () => AcrossBridge | SquidBridge;

const BRIDGE_REGISTRY: BridgeConstructor[] = [SquidBridge, AcrossBridge];

async function getTheBestBridge(
  account: string,
  fromChainId: number,
  toChainId: number,
  inputToken: string,
  targetToken: string,
  inputAmount: string,
  tokenPrices: number,
) {
  const bridges = await checkRatesBetweenBridges(
    account,
    fromChainId,
    toChainId,
    inputToken,
    targetToken,
    inputAmount,
    tokenPrices,
  );
  console.log("bridges", bridges);
  const availableBridges = bridges.filter(
    (b) => b.isAvailable && b.fee !== null,
  );
  if (availableBridges.length === 0)
    throw new Error("No available bridges found");

  availableBridges.sort((a, b) => Number(a.fee) - Number(b.fee));

  return availableBridges[0].bridge;
}

async function checkBridge(
  BridgeClass: BridgeConstructor,
  params: {
    account: string;
    fromChainId: number;
    toChainId: number;
    inputToken: string;
    targetToken: string;
    inputAmount: string;
    tokenPrices: number;
  },
): Promise<BridgeInfo> {
  const bridge = new BridgeClass();

  try {
    await bridge.init();

    const commonParams = [
      params.account,
      params.fromChainId,
      params.toChainId,
      params.inputToken,
      params.targetToken,
      params.inputAmount,
    ];

    const feeCosts = await (bridge instanceof AcrossBridge
      ? bridge.fetchFeeCosts(...commonParams, params.tokenPrices)
      : bridge.fetchFeeCosts(...commonParams, false));

    return {
      bridge,
      fee: feeCosts?.toString() ?? null,
      isAvailable: true,
    };
  } catch (error) {
    return {
      bridge,
      fee: null,
      isAvailable: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function checkRatesBetweenBridges(
  account: string,
  fromChainId: number,
  toChainId: number,
  inputToken: string,
  targetToken: string,
  inputAmount: string,
  tokenPrices: number,
): Promise<BridgeInfo[]> {
  const params = {
    account,
    fromChainId,
    toChainId,
    inputToken,
    targetToken,
    inputAmount,
    tokenPrices,
  };

  const bridgeChecks = BRIDGE_REGISTRY.map((BridgeClass) =>
    checkBridge(BridgeClass, params),
  );

  return Promise.all(bridgeChecks);
}

export default getTheBestBridge;
