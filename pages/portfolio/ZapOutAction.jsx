import { Button } from "antd";
import DecimalStep from "../indexes/DecimalStep";
import ConfiguredConnectButton from "../ConnectButton";

export default function ZapOutAction({
  account,
  selectedToken,
  handleSetSelectedToken,
  handleAAWalletAction,
  usdBalance,
  zapOutIsLoading,
  usdBalanceLoading,
  setZapOutPercentage,
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