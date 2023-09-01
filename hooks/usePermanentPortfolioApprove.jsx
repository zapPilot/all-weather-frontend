import permanentPortfolioJson from "../lib/contracts/PermanentPortfolioLPToken.json";
import { useContractWrite } from "wagmi";
import { wethAddress } from "../utils/oneInch";

const usePermanentPortfolioApprove = () => {
  const {
    write: approveWrite,
    isLoading: approveIsLoading,
    isSuccess: approveIsSuccess,
  } = useContractWrite({
    address: wethAddress,
    // for testing
    // address: portfolioContractAddress,
    abi: permanentPortfolioJson.abi,
    functionName: "approve",
  });
  return { approveWrite, approveIsLoading, approveIsSuccess };
};

export default usePermanentPortfolioApprove;
