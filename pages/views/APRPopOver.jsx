import React, { useState, useEffect } from 'react';
import { Button, Popover } from 'antd';
import permanentPortfolioJson from "../../lib/contracts/PermanentPortfolioLPToken.json";
import {InfoCircleOutlined } from "@ant-design/icons";
const { ethers } = require("ethers");
const TOKEN_ADDR_TO_IMG = {
  "0xd4d42F0b6DEF4CE0383636770eF773390d85c61A": {
    img: "https://arbiscan.io/token/images/sushitoken_32.png",
    symbol: "SUSHI"
  },
  "0x6C2C06790b3E3E3c38e12Ee22F8183b37a13EE55": {
    img: "https://arbiscan.io/token/images/dopex-dpx_32.png",
    symbol: "DPX"
  },
  "0x0c880f6761F1af8d9Aa9C466984b80DAb9a8c9e8": {
    img: "https://arbiscan.io/token/images/pendlefin_32.png",
    symbol: "PENDLE"
  },
  "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1": {
    img: "https://arbiscan.io/token/images/weth_28.png",
    symbol: "WETH"
  },
  "0xBfbCFe8873fE28Dfa25f1099282b088D52bbAD9C": {
    img: "https://arbiscan.io/token/images/equlibria_32.png",
    symbol: "EQB"
  }
}

const APRPopOver = ({ address, mode }) => {
  const [claimableRewards, setClaimableRewards] = useState([]);
  const [content, setContent] = useState(null);

  useEffect(() => {
    async function fetchData() {
      if (typeof window.ethereum !== 'undefined') {
        const provider = new ethers.providers.JsonRpcProvider('http://localhost:8545');
        const signer = provider.getSigner();
        const contract = new ethers.Contract("0x52B1CA27095283a359Cc46F1dE04f6123e289935", permanentPortfolioJson.abi, signer);
  
        try {
          // const claimableRewards = await contract.getClaimableRewards(address);
          const claimableRewards = [
            {
              "protocol": "SushSwap-DpxETH",
              "claimableRewards": [
                {
                  "token": "0xd4d42F0b6DEF4CE0383636770eF773390d85c61A",
                  "amount": "111"
                },
                {
                  "token": "0x6C2C06790b3E3E3c38e12Ee22F8183b37a13EE55",
                  "amount": "11111"
                }
              ]
            },
            {
              "protocol": "Equilibria-GLP",
              "claimableRewards": [
                {
                  "token": "0x0c880f6761F1af8d9Aa9C466984b80DAb9a8c9e8",
                  "amount": "111"
                },
                {
                  "token": "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
                  "amount": "11111"
                },
                {
                  "token": "0xBfbCFe8873fE28Dfa25f1099282b088D52bbAD9C",
                  "amount": "11111"
                }
              ]
            },
            {
              "protocol": "Equilibria-GDAI",
              "claimableRewards": [
                {
                  "token": "0x0c880f6761F1af8d9Aa9C466984b80DAb9a8c9e8",
                  "amount": "1111"
                },
                {
                  "token": "0xBfbCFe8873fE28Dfa25f1099282b088D52bbAD9C",
                  "amount": "11111"
                }
              ]
            },
            {
              "protocol": "Equilibria-RETH",
              "claimableRewards": [
                {
                  "token": "0x0c880f6761F1af8d9Aa9C466984b80DAb9a8c9e8",
                  "amount": "1111"
                },
                {
                  "token": "0xBfbCFe8873fE28Dfa25f1099282b088D52bbAD9C",
                  "amount": "11111"
                }
              ]
            }
          ]
          console.log("claimableRewards: ", claimableRewards);
          setClaimableRewards(claimableRewards);
        } catch (error) {
          console.error("An error occurred:", error);
        }
      }
    }

    fetchData();
  }, []); // Empty dependency array to run the effect only once


  function renderContent(mode) {
    if (mode === 'percentage') { // Replace with your actual condition
      return (
        <ul>
          {claimableRewards.map((reward, index) => (
            <li key={index}>
              {reward.protocol}
              <ul>
                {reward.claimableRewards.map((claimableReward) => (
                  <li key={`${reward.protocol}-${claimableReward.token}`}>
                    <img src={TOKEN_ADDR_TO_IMG[claimableReward.token].img} width="20" height="20" />
                    {TOKEN_ADDR_TO_IMG[claimableReward.token].symbol}: {claimableReward.amount}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      );
    } else {
      return (
        <ul>
          {claimableRewards.map((reward, index) => (
            <li key={index}>
              {reward.protocol}
              <ul>
                {reward.claimableRewards.map((claimableReward) => (
                  <li key={`${reward.protocol}-${claimableReward.token}`}>
                    <img src={TOKEN_ADDR_TO_IMG[claimableReward.token].img} width="20" height="20" />
                    {TOKEN_ADDR_TO_IMG[claimableReward.token].symbol}: {claimableReward.amount}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      );
    }
  }

  return (
    <Popover
      style={{
        width: 500,
      }}
      content={renderContent()}
      title="Projected APR"
      trigger="hover"
    >
      <InfoCircleOutlined/>
    </Popover>
  );
};

export default APRPopOver;
