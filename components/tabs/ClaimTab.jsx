import { Button } from "antd";
import TokenDropdownInput from "../../pages/views/TokenDropdownInput.jsx";
import Image from "next/image";
export default function ClaimTab({
  selectedToken,
  handleSetSelectedToken,
  handleSetInvestmentAmount,
  tokenPricesMappingTable,
  handleAAWalletAction,
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
        >
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
        </Button>
      </div>
    </div>
  );
}
