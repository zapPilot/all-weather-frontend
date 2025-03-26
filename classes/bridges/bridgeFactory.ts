import AcrossBridge from "./across";
import SquidBridge from "./squid";
async function getTheBestBridge(
  account: string,
  fromChainId: number,
  toChainId: number,
  inputToken: string,
  targetToken: string,
  inputAmount: string,
) {
  const bridges = await checkRatesBetweenBridges(
    account,
    fromChainId,
    toChainId,
    inputToken,
    targetToken,
    inputAmount,
  );

  bridges.sort((a, b) => Number(a.fee) - Number(b.fee));
  
  // console.log("Bridge fees comparison:", bridges.map(b => ({
  //   name: b.bridge,
  //   fee: b.fee,
  //   // we can add more comparison info in the future
  // })));

  // 返回最佳的橋實例
  return bridges[0].bridge;
}
async function checkRatesBetweenBridges(
  account: string,
  fromChainId: number,
  toChainId: number,
  inputToken: string,
  targetToken: string,
  inputAmount: string,
) {
  let bridges = [];

  // const squid = new SquidBridge();
  // const squidFeeCosts = await squid.init(
  //   account,
  //   fromChainId,
  //   toChainId,
  //   inputToken,
  //   targetToken,
  //   inputAmount,
  // );
  // bridges.push({
  //   bridge: squid,
  //   fee: squidFeeCosts
  // });

  const across = new AcrossBridge();
  await across.init();

  const acrossFeeCosts = await across.fetchFeeCosts(
    account,
    fromChainId,
    toChainId,
    inputToken,
    targetToken,
    inputAmount,
  );

  bridges.push({
    bridge: across,
    fee: acrossFeeCosts
  });

  return bridges;
}

export default getTheBestBridge;
