/**
 * Get the next chain based on the current chain status and available chains
 * @param {string[]} availableAssetChains - List of available chains
 * @param {Object} chainStatus - Object mapping chain names to their completion status
 * @param {string} currentChain - The current chain name
 * @returns {string|null} The next chain to process, or null if all chains are complete
 */
export const getNextChain = (
  availableAssetChains,
  chainStatus,
  currentChain,
) => {
  // Get the current order before any chain switching
  const currentOrder = [...availableAssetChains].sort((a, b) => {
    // First priority: finished chains
    const aFinished = chainStatus[a];
    const bFinished = chainStatus[b];

    if (aFinished && !bFinished) return -1;
    if (!aFinished && bFinished) return 1;

    // Second priority: current chain
    if (a === currentChain) return -1;
    if (b === currentChain) return 1;

    // Third priority: shorter chain name first
    const lengthDiff = a.length - b.length;
    if (lengthDiff !== 0) return lengthDiff;

    // Fourth priority: alphabetic order
    return a.localeCompare(b);
  });

  // Filter out finished chains and get the first unfinished one
  const unfinishedChains = currentOrder.filter(
    (chain) => availableAssetChains.includes(chain) && !chainStatus[chain],
  );

  return unfinishedChains[0] || null;
};
