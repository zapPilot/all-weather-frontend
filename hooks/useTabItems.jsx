import ZapInTab from "../components/tabs/ZapInTab";
import ZapOutTab from "../components/tabs/ZapOutTab";
import ClaimTab from "../components/tabs/ClaimTab";
import RebalanceTab from "../components/tabs/RebalanceTab";
import TransferTab from "../components/tabs/TransferTab";

export default function useTabItems(props) {
  const tabItems = [
    {
      key: "1",
      label: "Deposit",
      children: <ZapInTab {...props} />,
    },
    {
      key: "2",
      label: "Withdraw",
      children: <ZapOutTab {...props} />,
    },
    {
      key: "3",
      label: "Rebalance",
      children: <RebalanceTab {...props} />,
    },
    {
      key: "4",
      label: "Transfer",
      children: <TransferTab {...props} />,
    },
    // claim is just for testing
    // {
    //   key: "5",
    //   label: "Claim",
    //   children: <ClaimTab {...props} />,
    // },
  ];

  return tabItems;
}
