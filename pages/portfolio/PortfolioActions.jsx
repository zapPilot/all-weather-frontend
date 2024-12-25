import { Tabs } from "antd";
import ZapInAction from "./ZapInAction";
import RebalanceAction from "./RebalanceAction";
import ZapOutAction from "./ZapOutAction";
import TransferAction from "./TransferAction";

export default function PortfolioActions(props) {
  const items = [
    {
      key: "1",
      label: "Zap In",
      children: <ZapInAction {...props} />,
    },
    {
      key: "2",
      label: "Rebalance",
      children: <RebalanceAction {...props} />,
    },
    {
      key: "3",
      label: "Zap Out",
      children: <ZapOutAction {...props} />,
    },
    {
      key: "4",
      label: "Transfer",
      children: <TransferAction {...props} />,
    },
  ];

  return (
    <Tabs
      className="text-white"
      defaultActiveKey="1"
      items={items}
      onChange={props.onChange}
    />
  );
} 