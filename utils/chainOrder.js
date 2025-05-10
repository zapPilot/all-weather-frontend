/**
 * Sorts chains based on their completion status, current chain, name length, and alphabetic order
 * @param {string[]} availableAssetChains - Array of available chain names
 * @param {Object} chainStatus - Object mapping chain names to their completion status
 * @param {string} currentChain - The current active chain
 * @returns {string[]} Sorted array of chain names
 */
export const sortChains = (availableAssetChains, chainStatus, currentChain) => {
  if (!availableAssetChains) return [];

  return [...availableAssetChains].sort((a, b) => {
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
};

/**
 * Gets the next chain to process based on the current state
 * @param {string[]} availableAssetChains - Array of available chain names
 * @param {Object} chainStatus - Object mapping chain names to their completion status
 * @param {string} currentChain - The current active chain
 * @returns {string|null} The next chain to process, or null if all chains are complete
 */
export const getNextChain = (
  availableAssetChains,
  chainStatus,
  currentChain,
) => {
  const sortedChains = sortChains(
    availableAssetChains,
    chainStatus,
    currentChain,
  );
  return sortedChains.find((chain) => !chainStatus[chain]) || null;
};
