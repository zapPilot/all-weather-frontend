// Kept in its own leaf module: both utils/aaExit.js and classes/BasePortfolio.jsx
// need it, and aaExit already imports the vault registry that BasePortfolio sits
// under — importing it back from there would close an import cycle.

const exitAssetAddressOf = (protocol) =>
  protocol.interface.sweptAssetAddress()?.toLowerCase() || null;

/**
 * The protocols allowed to sweep the pre-existing wallet balance of their asset.
 * emergencyTransfer hands over `unstakedAmount + assetBalanceOf(owner)`, so two
 * positions sharing one assetContract each claim the whole loose balance: both
 * pass a dry-run alone, and the combined batch reverts with "transfer amount
 * exceeds balance". sweptAssetAddress is plain metadata, so designating one owner
 * per asset costs no RPC. Positions with no asset address (NFTs) never contend,
 * so they are always included.
 * Membership is by object identity — callers pass the same array they iterate.
 */
export function designateWalletBalanceSweepers(protocols) {
  const claimed = new Set();
  const sweepers = new Set();
  for (const protocol of protocols || []) {
    const address = exitAssetAddressOf(protocol);
    if (address && claimed.has(address)) continue;
    if (address) claimed.add(address);
    sweepers.add(protocol);
  }
  return sweepers;
}

/**
 * Assets more than one position hands over. Names the positions that would
 * otherwise compete for one balance — which is what a combined batch failing
 * while every item passes alone actually looks like.
 */
export function sharedExitAssets(protocols) {
  const byAsset = new Map();
  for (const protocol of protocols || []) {
    const address = exitAssetAddressOf(protocol);
    if (!address) continue;
    const label = protocol.label || protocol.interface.toString();
    byAsset.set(address, [...(byAsset.get(address) || []), label]);
  }
  return [...byAsset.entries()]
    .filter(([, labels]) => labels.length > 1)
    .map(([address, labels]) => ({ address, labels }));
}
