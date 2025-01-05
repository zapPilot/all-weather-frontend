import { Button } from "antd";
import DecimalStep from "../../pages/indexes/DecimalStep";
import ConfiguredConnectButton from "../../pages/ConnectButton";

export default function ZapOutTab({
  selectedToken,
  handleSetSelectedToken,
  usdBalance,
  setZapOutPercentage,
  account,
  handleAAWalletAction,
  zapOutIsLoading,
  zapOutPercentage,
  usdBalanceLoading,
}) {
  return (
    <div>
      <DecimalStep
        selectedToken={selectedToken}
        setSelectedToken={handleSetSelectedToken}
        depositBalance={usdBalance}
        setZapOutPercentage={setZapOutPercentage}
        currency="$"
        noTokenSelect={false}
      />
      {account === undefined ? (
        <ConfiguredConnectButton />
      ) : (
        <Button
          type="primary"
          className="w-full"
          onClick={() => handleAAWalletAction("zapOut", true)}
          loading={zapOutIsLoading || usdBalanceLoading}
          disabled={
            usdBalance < 0.01 ||
            zapOutPercentage === 0 ||
            selectedToken?.split("-")[0].toLowerCase() === "eth"
          }
        >
          Withdraw
        </Button>
      )}
    </div>
  );
}
