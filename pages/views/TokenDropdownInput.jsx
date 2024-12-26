import React, { useEffect, memo, useState } from "react";
import { Button, Space } from "antd";
import {
  useWalletBalance,
  useActiveWalletChain,
  useActiveAccount,
} from "thirdweb/react";
import THIRDWEB_CLIENT from "../../utils/thirdweb";
import {
  arbitrum,
  base,
  optimism,
  bsc,
  polygon,
  mantle,
} from "thirdweb/chains";
import NumericInput from "./NumberInput";
import { selectBefore } from "../../utils/contractInteractions";

const chainIdToChain = {
  8453: base,
  42161: arbitrum,
  10: optimism,
  56: bsc,
  137: polygon,
  5000: mantle,
};

const TokenDropdownInput = memo(
  ({
    selectedToken,
    setSelectedToken,
    setInvestmentAmount,
    tokenPricesMappingTable,
  }) => {
    const [localInvestmentAmount, setLocalInvestmentAmount] = useState("");
    const tokenAddress = selectedToken?.split("-")[1];
    const account = useActiveAccount();
    const chainId = useActiveWalletChain();
    const { data, isLoading } = useWalletBalance({
      chain: chainIdToChain[chainId?.id],
      address: account?.address,
      client: THIRDWEB_CLIENT,
      ...(tokenAddress !== "0x0000000000000000000000000000000000000000" && {
        tokenAddress,
      }),
    });

    const handleInputChange = (eventValue) => {
      setLocalInvestmentAmount(parseFloat(eventValue) || 0);
      setInvestmentAmount(eventValue);
    };

    const handleOnClickMax = () => {
      if (data?.displayValue) {
        setLocalInvestmentAmount(data.displayValue);
        setInvestmentAmount(data.displayValue);
      }
    };

    const handleTokenChange = (value) => {
      setSelectedToken(value);
      setLocalInvestmentAmount(""); // Reset the input when token changes
      setInvestmentAmount(0); // Also reset the parent state
    };

    useEffect(() => {
      // Reset the input when selectedToken changes
      setLocalInvestmentAmount("");
      setInvestmentAmount(0);
    }, [selectedToken, setInvestmentAmount]);

    useEffect(() => {}, [localInvestmentAmount]);

    return (
      <>
        <Space.Compact role="crypto_input">
          {selectBefore(handleTokenChange, chainId?.id, selectedToken)}
          <NumericInput
            placeholder={isLoading ? "Loading..." : "Enter amount"}
            value={localInvestmentAmount}
            onChange={handleInputChange}
          />
          <Button
            type="primary"
            onClick={handleOnClickMax}
            disabled={isLoading || !data?.displayValue}
          >
            Max
          </Button>
        </Space.Compact>
        <div className="mt-2 text-sm">
          Balance:{" "}
          <span
            className={
              localInvestmentAmount > parseFloat(data?.displayValue)
                ? "text-red-400"
                : "text-gray-400"
            }
          >
            {isLoading ? "Loading..." : data?.displayValue || "0"}
          </span>
          {localInvestmentAmount > parseFloat(data?.displayValue) && (
            <p className="text-red-400">
              Please send more tokens to your AA Wallet to continue.
              <br />
              Click on the top-right corner to get your AA Wallet address.
            </p>
          )}
          {tokenPricesMappingTable &&
            tokenPricesMappingTable[
              selectedToken?.split("-")[0].toLowerCase()
            ] && (
              <p className="text-gray-400">
                ≈ $
                {(
                  tokenPricesMappingTable[
                    selectedToken?.split("-")[0].toLowerCase()
                  ] * localInvestmentAmount
                ).toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{" "}
                USD
              </p>
            )}
        </div>
      </>
    );
  },
);

TokenDropdownInput.displayName = "TokenDropdownInput";

export default TokenDropdownInput;
