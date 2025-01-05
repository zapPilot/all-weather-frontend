import ZapInTab from "../components/tabs/ZapInTab";
import RebalanceTab from "../components/tabs/RebalanceTab";
import ZapOutTab from "../components/tabs/ZapOutTab";
import TransferTab from "../components/tabs/TransferTab";

export default function useTabItems(props) {
  const tabItems = [
    {
      key: "1",
      label: "Zap In",
      children: <ZapInTab {...props} />,
    },
    {
      key: "2",
      label: "Rebalance",
      children: <RebalanceTab {...props} />,
    },
    {
      key: "3",
      label: "Zap Out",
      children: <ZapOutTab {...props} />,
    },
    {
      key: "4",
      label: "Transfer",
      children: <TransferTab {...props} />,
    },
  ];

  return tabItems;
}
