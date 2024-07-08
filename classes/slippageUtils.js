const approvalBufferParam = 1.2;
// number: min: 0, max: 50
const slippage = [1, 3, 5];

// would get `Error: execution reverted: Price slippage check` if it hit the amount0Min and amount1Min when providing liquidity
// const slippageOfLP = [0.95, 0.9, 0.8, 0.7, 0.6];
const slippageOfLP = [0.99, 0.97, 0.95];

export { approvalBufferParam, slippage, slippageOfLP };
