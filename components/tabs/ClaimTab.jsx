import { Button } from "antd";
import { MINIMUM_CLAIM_AMOUNT } from "../../config/minimumThresholds";

const formatUSD = (value) => value.toFixed(2);

const getChainRewards = (pendingRewards, currentChain) => {
  if (!pendingRewards || !currentChain) return { biggest: 0, total: 0 };

  let biggestValue = 0;
  let totalValue = 0;

  for (const [address, reward] of Object.entries(pendingRewards)) {
    if (reward.chain === currentChain) {
      if (reward.usdDenominatedValue > 0) {
        biggestValue = Math.max(biggestValue, reward.usdDenominatedValue);
      }
      totalValue += reward.usdDenominatedValue;
    }
  }

  return {
    biggest: biggestValue,
    total: totalValue,
  };
};

export default function ClaimTab({
  handleAAWalletAction,
  pendingRewards,
  chainId,
}) {
  const currentChain = chainId?.name
    ?.toLowerCase()
    .replace(" one", "")
    .replace(" mainnet", "")
    .trim();

  const { biggest: biggestRewardValue, total: totalRewardValue } =
    getChainRewards(pendingRewards, currentChain);

  const renderButtonContent = () => {
    if (biggestRewardValue < MINIMUM_CLAIM_AMOUNT) {
      return `Need ${MINIMUM_CLAIM_AMOUNT} USD on ${currentChain} to claim, or use Rebalance instead (current: ${formatUSD(
        biggestRewardValue,
      )} USD)`;
    }

    return `Claim ${formatUSD(totalRewardValue)} USD rewards`;
  };

  return (
    <div className="grid grid-cols-1 gap-4">
      <div>
        <Button
          type="primary"
          className="w-full my-2 flex items-center justify-center gap-1"
          onClick={() => handleAAWalletAction("claimAndSwap", true)}
          disabled={biggestRewardValue < MINIMUM_CLAIM_AMOUNT}
          title={`Minimum claim amount is ${MINIMUM_CLAIM_AMOUNT} USD`}
        >
          {renderButtonContent()}
        </Button>
        <p className="text-sm text-gray-300">
          Rewards will stay in their original tokens. Use DustZap after claiming
          to convert them to ETH.
        </p>
      </div>
    </div>
  );
}
