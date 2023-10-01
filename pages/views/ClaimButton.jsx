import { Button, message } from "antd";
import { portfolioContractAddress } from "../../utils/oneInch";
import { DollarOutlined } from "@ant-design/icons";
import { useContractWrite, useAccount } from "wagmi";
import permanentPortfolioJson from "../../lib/contracts/PermanentPortfolioLPToken.json";

const ClaimButton = () => {
  const { address } = useAccount();
  const [messageApi, contextHolder] = message.useMessage();
  const { write } = useContractWrite({
    address: portfolioContractAddress,
    abi: permanentPortfolioJson.abi,
    functionName: "claim",
    args: [address],
    gas: 40_000_000n,
    onError(error) {
      messageApi.error({
        content: error.shortMessage,
        duration: 5,
      });
    },
    onSuccess() {
      messageApi.info("Claim succeeded");
    },
  });

  return (
    <div>
      {contextHolder}
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
    </div>
  );
};

export default ClaimButton;
