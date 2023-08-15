import { Spin, Row, Col, Button } from "antd";
import { DollarOutlined, FireOutlined } from "@ant-design/icons";
import { useEffect, useState } from "react";
const { ethers } = require("ethers");


// Import ABI
import permanentPortfolioJson from "../../lib/contracts/PermanentPortfolioLPToken.json";

const ZapInButton = ({ address }) => {
  const [signer, setSigner] = useState(null);
  const [permanentPortfolio, setPermanentPortfolio] = useState(null);

  useEffect(() => {
    if (typeof window.ethereum !== 'undefined') {
      // Define a provider and connect to a signer (e.g., Metamask)
      const provider = new ethers.providers.JsonRpcProvider('http://localhost:8545'); // or the port your local blockchain is running on
      // const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      setSigner(signer);
      const contract = new ethers.Contract("0x3378b974E111B6A27Df5CF8b96AD646b1860EcD0", permanentPortfolioJson.abi, signer);
      setPermanentPortfolio(contract);
      getClaimableRewards(permanentPortfolio);
    }
  }, []);
  
  const getClaimableRewards = async (permanentPortfolio) => {
    try {
      // Define any parameters required by the deposit function
      const claimableRewards = await permanentPortfolio.getClaimableRewards("0x43cd745Bd5FbFc8CfD79ebC855f949abc79a1E0C");
      console.log("claimableRewards: ", claimableRewards);
      setClaimableRewards(claimableRewards);
    } catch (error) {
      console.error("An error occurred:", error);
    }
  }

  const handleZapIn = async () => {
    try {
      // Define any parameters required by the deposit function
      const tx = await permanentPortfolio.deposit();
      console.log("Transaction sent:", tx.hash);

      // Wait for the transaction to be confirmed
      const receipt = await tx.wait();
      console.log("Transaction confirmed:", receipt);

      // Additional code for post-transaction actions
    } catch (error) {
      console.error("An error occurred:", error);
    }
  };

  return (
    <Button
      onClick={handleZapIn} // Added onClick handler
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
    >
      Zap In
    </Button>
  );
};

export default ZapInButton;
