import { Space, InputNumber, Slider, Button } from "antd";
import { useState, useEffect } from "react";
import { selectBefore } from "../../utils/contractInteractions";
import { useActiveWalletChain } from "thirdweb/react";

const DecimalStep = ({
  depositBalance,
  setZapOutPercentage,
  currency,
  selectedToken,
  setSelectedToken,
  noTokenSelect,
  zapOutIsLoading,
  usdBalanceLoading,
}) => {
  const [inputValue, setInputValue] = useState(0);
  const [sliderValue, setSliderValue] = useState(0);
  const chainId = useActiveWalletChain();
  const handleTokenChange = (value) => {
    setSelectedToken(value);
  };

  // Update inputValue when depositBalance changes
  useEffect(() => {
    setInputValue(0);
    setSliderValue(0); // Reset slider to 100% when depositBalance changes
  }, [depositBalance]);

  useEffect(() => {
    // Update slider when input changes
    const newSliderValue = (inputValue / depositBalance) * 100;
    setSliderValue(newSliderValue);
    setZapOutPercentage(newSliderValue / 100);
  }, [inputValue, depositBalance, setZapOutPercentage]);

  const onSliderChange = (newValue) => {
    setSliderValue(newValue);
    const newInputValue = (newValue / 100) * depositBalance;
    setInputValue(newInputValue);
    setZapOutPercentage(newValue / 100);
  };

  const onInputChange = (newValue) => {
    if (newValue === null || isNaN(newValue) || newValue < 0) {
      return;
    }
    const clampedValue = Math.min(newValue, depositBalance);
    setInputValue(clampedValue);
  };

  const handleOnClickMax = () => {
    setInputValue(depositBalance);
    setSliderValue(100);
    setZapOutPercentage(1);
  };

  return (
    <>
      <Space.Compact>
        {!noTokenSelect &&
          selectBefore(handleTokenChange, chainId?.id, selectedToken)}
        <InputNumber
          min={0}
          max={depositBalance}
          step={1}
          value={inputValue?.toFixed(0)}
          onChange={onInputChange}
          formatter={(value) =>
            `${currency} ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
          }
          parser={(value) => value.replace(/[^\d.]/g, "")}
        />
        <Button
          type="primary"
          onClick={handleOnClickMax}
          disabled={zapOutIsLoading || usdBalanceLoading}
        >
          Max
        </Button>
      </Space.Compact>
      <Slider
        min={0}
        max={100}
        onChange={onSliderChange}
        value={sliderValue}
        step={1}
        disabled={zapOutIsLoading || usdBalanceLoading}
      />
    </>
  );
};

export default DecimalStep;
