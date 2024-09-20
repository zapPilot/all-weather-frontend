import React, { useEffect, memo, useState } from "react";
import { Button, Space } from "antd";
import {
  useWalletBalance,
  useActiveWalletChain,
  useActiveAccount,
} from "thirdweb/react";
import THIRDWEB_CLIENT from "../../utils/thirdweb";
import { arbitrum } from "thirdweb/chains";
import NumericInput from "./NumberInput";
import { selectBefore } from "../../utils/contractInteractions";

const TokenDropdownInput = memo(
  ({ selectedToken, setSelectedToken, setInvestmentAmount }) => {
    const [localInvestmentAmount, setLocalInvestmentAmount] = useState("");
    const tokenAddress = selectedToken?.split("-")[1];
    const account = useActiveAccount();
    const chainId = useActiveWalletChain();
    const { data, isLoading } = useWalletBalance({
      chain: arbitrum,
      address: account?.address,
      client: THIRDWEB_CLIENT,
      tokenAddress,
    });

    const handleInputChange = (eventValue) => {
      setLocalInvestmentAmount(eventValue);
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
        <div className="mt-2 text-sm text-gray-400">
          Balance: {isLoading ? "Loading..." : data?.displayValue || "0"}
        </div>
      </>
    );
  },
);

TokenDropdownInput.displayName = "TokenDropdownInput";

export default TokenDropdownInput;
