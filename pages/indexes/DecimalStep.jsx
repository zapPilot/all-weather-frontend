import { Col, InputNumber, Row, Slider } from "antd";
import { useState, useEffect } from "react";

const DecimalStep = ({ depositBalance, setZapOutPercentage, currency }) => {
  const [inputValue, setInputValue] = useState(depositBalance);
  const [sliderValue, setSliderValue] = useState(100);

  // Update inputValue when depositBalance changes
  useEffect(() => {
    setInputValue(depositBalance);
    setSliderValue(100); // Reset slider to 100% when depositBalance changes
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

  return (
    <Row>
      <Col span={12}>
        <Slider
          min={0}
          max={100}
          onChange={onSliderChange}
          value={sliderValue}
          step={1}
        />
      </Col>
      <Col span={12}>
        <InputNumber
          min={0}
          max={depositBalance}
          className="w-full"
          step={1}
          value={inputValue?.toFixed(0)}
          onChange={onInputChange}
          formatter={(value) =>
            `${currency} ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
          }
          parser={(value) => value.replace(/[^\d.]/g, "")}
        />
      </Col>
    </Row>
  );
};

export default DecimalStep;
