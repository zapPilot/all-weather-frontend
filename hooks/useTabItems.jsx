import ZapInTab from "../components/tabs/ZapInTab";
import ZapOutTab from "../components/tabs/ZapOutTab";
import ClaimTab from "../components/tabs/ClaimTab";
import RebalanceTab from "../components/tabs/RebalanceTab";
import TransferTab from "../components/tabs/TransferTab";
import { Typography, Spin } from 'antd';

export default function useTabItems(props) {
  const pendingRewards = calculatePendingRewards(props.pendingRewards);
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
      label: "Transfer",
      children: <TransferTab {...props} />,
    },
    {
      key: "4",
      label: "Rebalance",
      children: <RebalanceTab {...props} />,
    },
    // claim is just for testing
    {
      key: "5",
      label: (
        <span>
          Claim (
          {props.pendingRewardsLoading ? (
            <Spin size="small" />
          ) : (
            <Typography.Text style={{ 
              color: '#5DFDCB', 
              fontSize: '1.1em',
              fontWeight: 'bold',
              textShadow: '0 0 8px rgba(255, 184, 0, 0.3)'
            }}>
              {pendingRewards.toLocaleString('en-US', {
                style: 'currency',
                currency: 'USD'
              })}
            </Typography.Text>
          )}
          )
        </span>
      ),
      children: <ClaimTab {...props} />,
    },
  ];

  return tabItems;
}

function calculatePendingRewards(pendingRewards) {
  return Object.values(pendingRewards)
    .reduce((acc, reward) => acc + (reward.usdDenominatedValue || 0), 0);
}
