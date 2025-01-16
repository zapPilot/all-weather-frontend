import { Button } from "antd";
import TokenDropdownInput from "../../pages/views/TokenDropdownInput.jsx";
export default function ClaimTab({
  selectedToken,
  handleSetSelectedToken,
  handleSetInvestmentAmount,
  tokenPricesMappingTable,
  handleAAWalletAction,
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <TokenDropdownInput
          selectedToken={selectedToken}
          setSelectedToken={handleSetSelectedToken}
          setInvestmentAmount={handleSetInvestmentAmount}
          tokenPricesMappingTable={tokenPricesMappingTable}
        />
        <Button
          type="primary"
          className="w-full my-2"
          onClick={() => handleAAWalletAction("claimAndSwap", true)}
        >
          Claim
        </Button>
      </div>
    </div>
  );
}
