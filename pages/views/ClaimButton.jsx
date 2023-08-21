import { Button } from "antd";
import { portfolioContractAddress } from "../../utils/oneInch";
import { DollarOutlined } from "@ant-design/icons";
import { useContractWrite, useAccount } from "wagmi";
import permanentPortfolioJson from "../../lib/contracts/PermanentPortfolioLPToken.json";

const ClaimButton = () => {
  const { address } = useAccount();
  const { write } = useContractWrite({
    address: portfolioContractAddress,
    abi: permanentPortfolioJson.abi,
    functionName: "claim",
    args: [address],
  });

  return (
    <Button
      style={{
        color: "white",
        borderColor: "white",
        paddingInline: 10,
        lineHeight: 1,
        marginRight: 15,
      }}
      shape="round"
      icon={<DollarOutlined />}
      size="small"
      onClick={() => write()}
    >
      Claim
    </Button>
  );
};

export default ClaimButton;
