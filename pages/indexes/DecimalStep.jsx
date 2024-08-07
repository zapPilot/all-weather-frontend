import { Col, InputNumber, Row, Slider } from "antd";
const DecimalStep = ({ setZapOutPercentage, sliderValue, setSliderValue }) => {
  const max = 100;
  const step = 0.01;
  const onChange = (value) => {
    if (isNaN(value)) {
      return;
    }
    setSliderValue(value);
    setZapOutPercentage(value / 100);
  };
  return (
    <Row>
      <Col span={12}>
        <Slider
          min={0}
          max={max}
          onChange={onChange}
          value={typeof sliderValue === "number" ? sliderValue : 0}
          step={step}
        />
      </Col>
      <Col span={4}>
        <InputNumber
          min={0}
          max={max}
          style={{
            margin: "0 16px",
          }}
          step={step}
          value={sliderValue}
          onChange={onChange}
        />
      </Col>
    </Row>
  );
};
export default DecimalStep;
