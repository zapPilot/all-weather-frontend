import { Button } from "antd";
import TokenDropdownInput from "../../pages/views/TokenDropdownInput.jsx";
import Image from "next/image";
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
  selectedToken,
  handleSetSelectedToken,
  handleSetInvestmentAmount,
  tokenPricesMappingTable,
  handleAAWalletAction,
  pendingRewards,
  chainId,
}) {
  const currentChain = chainId?.name
    ?.toLowerCase()
    .replace(" one", "")
    .replace(" mainnet", "")
    .trim();

  const selectedTokenSymbol = selectedToken?.split("-")[0];
  const { biggest: biggestRewardValue, total: totalRewardValue } =
    getChainRewards(pendingRewards, currentChain);

  const renderButtonContent = () => {
    if (biggestRewardValue < MINIMUM_CLAIM_AMOUNT) {
      return `Need ${MINIMUM_CLAIM_AMOUNT} USD on ${currentChain} to claim, or use Rebalance instead (current: ${formatUSD(
        biggestRewardValue,
      )} USD)`;
    }

    return (
      <>
        Convert Rewards to ${formatUSD(totalRewardValue)} worth of
        <Image
          key={selectedTokenSymbol}
          src={`/tokenPictures/${selectedTokenSymbol}.webp`}
          width="20"
          height="20"
          alt={selectedTokenSymbol}
          className="inline-block"
        />
        {selectedTokenSymbol}
      </>
    );
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <TokenDropdownInput
          selectedToken={selectedToken}
          setSelectedToken={handleSetSelectedToken}
          setInvestmentAmount={handleSetInvestmentAmount}
          tokenPricesMappingTable={tokenPricesMappingTable}
          mode="claim"
        />
        <Button
          type="primary"
          className="w-full my-2 flex items-center justify-center gap-1"
          onClick={() => handleAAWalletAction("claimAndSwap", true)}
          disabled={biggestRewardValue < MINIMUM_CLAIM_AMOUNT}
          title={`Minimum claim amount is ${MINIMUM_CLAIM_AMOUNT} USD`}
        >
          {renderButtonContent()}
        </Button>
      </div>
    </div>
  );
}
