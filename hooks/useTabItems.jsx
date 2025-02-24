import ZapInTab from "../components/tabs/ZapInTab";
import ZapOutTab from "../components/tabs/ZapOutTab";
import ClaimTab from "../components/tabs/ClaimTab";
import RebalanceTab from "../components/tabs/RebalanceTab";
import TransferTab from "../components/tabs/TransferTab";
import { Typography, Spin } from 'antd';
import APRComposition from "../pages/views/components/APRComposition";

export default function useTabItems(props) {
  const sumOfPendingRewards = calculateSumOfPendingRewards(props.pendingRewards);
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
              {sumOfPendingRewards.toLocaleString('en-US', {
                style: 'currency',
                currency: 'USD'
              })}
            </Typography.Text>
          )}
          )            <APRComposition
                      APRData={props.pendingRewards}
                      mode="pendingRewards"
                      currency="$"
                      exchangeRateWithUSD={1}
                      pendingRewardsLoading={props.pendingRewardsLoading}
                    />
        </span>
      ),
      children: <ClaimTab {...props} />,
    },
  ];

  return tabItems;
}

function calculateSumOfPendingRewards(pendingRewards) {
  return Object.values(pendingRewards)
    .reduce((acc, reward) => acc + (reward.usdDenominatedValue || 0), 0);
}
