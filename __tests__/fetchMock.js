import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL;
const searchWalletAddress = "undefined";
const walletAddress = "0xca35a10c9622febfa889410efb9b905b26221c37";

export const fetchApr = async () => {
  const response = await axios.get(
    `${API_URL}/bundle_portfolio/${
      searchWalletAddress === undefined
        ? walletAddress
        : searchWalletAddress.toLowerCase().trim().replace("/", "")
    }?refresh=true`,
  );
  const { portfolio_apr } = response;
  return portfolio_apr;
};
