import BasePage from "../basePage";
import Dashboard from "../dashboard.tsx";
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
        <Dashboard />
      </Col>
    </BasePage>
  );
}
