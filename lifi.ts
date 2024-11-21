import axios from "axios";
import { ethers } from "ethers";

const endpoint = "https://li.quest/v1/quote/contractCalls";

const USDC_ON_ARB = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
const KLIMA_ON_POL = "0x4e78011ce80ee02d2c3e649fb657e45898257815";
const SKLIMA_ON_POL = "0xb0c22d8d350c67420f06f48936654f567c73e8c8";

const KLIMA_STAKING_CONTRACT = "0x4D70a031Fc76DA6a9bC0C922101A05FA95c3A227";

// Full ABI on
// https://polygonscan.com/address/0x4D70a031Fc76DA6a9bC0C922101A05FA95c3A227#code
const KLIMA_STAKING_ABI = ["function stake(uint _amount) external"];

const generateKLIMATransaction = async (receivedAmount: string) => {
  const stakeKlimaTx = await new ethers.Contract(
    KLIMA_STAKING_CONTRACT,
    KLIMA_STAKING_ABI,
  ).populateTransaction.stake(receivedAmount);
  return stakeKlimaTx;
};

const getQuote = async (): Promise<any> => {
  // We would like to stake this amount of KLIMA to get sKLIMA
  const stakeAmount = "1000000000";

  const stakeKlimaTx = await generateKLIMATransaction(stakeAmount);

  const quoteRequest = {
    fromChain: "ARB",
    fromToken: USDC_ON_ARB,
    fromAddress: "0x552008c0f6870c2f77e5cC1d2eb9bdff03e30Ea0",
    toChain: "POL",
    toToken: KLIMA_ON_POL,
    toAmount: stakeAmount,
    contractCalls: [
      {
        fromTokenAddress: "0x4e78011Ce80ee02d2c3e649Fb657E45898257815", // KLIMA on POL
        fromAmount: stakeAmount,
        toContractAddress: stakeKlimaTx.to,
        toContractCallData: stakeKlimaTx.data,
        toContractGasLimit: "900000",
        contractOutputsToken: SKLIMA_ON_POL,
      },
    ],
  };

  const response = await axios.post(endpoint, quoteRequest);
  return response.data;
};

getQuote().then(console.log);
