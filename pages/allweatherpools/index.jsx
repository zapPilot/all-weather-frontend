import BasePage from "../basePage";
import AllWeatherPools from "../CustomizedPools";
import { Col } from "antd";

export default function Vote() {
  return (
    <BasePage>
      <Col
        xs={{
          span: 24,
          offset: 0,
        }}
        md={{
          span: 18,
          offset: 3,
        }}
      >
        <AllWeatherPools />
      </Col>
    </BasePage>
  );
}
