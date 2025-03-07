import { Button } from "antd";
import TokenDropdownInput from "../../pages/views/TokenDropdownInput.jsx";
import Image from "next/image";
const minClaimAmount = 50;
export default function ClaimTab({
  selectedToken,
  handleSetSelectedToken,
  handleSetInvestmentAmount,
  tokenPricesMappingTable,
  handleAAWalletAction,
  sumOfPendingRewards,
}) {
  const selectedTokenSymbol = selectedToken?.split("-")[0];
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
          disabled={sumOfPendingRewards < minClaimAmount}
          title={`Minimum claim amount is ${minClaimAmount} USD`}
        >
          {sumOfPendingRewards < minClaimAmount ? (
            `Need ${minClaimAmount} USD to claim, or use Rebalance instead (current: ${sumOfPendingRewards.toFixed(
              2,
            )} USD)`
          ) : (
            <>
              Convert Rewards to
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
          )}
        </Button>
      </div>
    </div>
  );
}
