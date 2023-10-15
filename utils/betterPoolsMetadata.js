import axios from "axios";
import { useState, useEffect } from "react";
const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function useBetterPoolsMetadata() {
  const [betterPoolsMetadata, setBetterPoolsMetadata] = useState({
    categorized_positions: {},
    top_n_with_metadata: [],
    topn_stable_coins: [],
  });

  // Function to load suggestions from the API
  const loadSuggestions = async () => {
    await axios
      .get(`${API_URL}/better_pools_of_assets`)
      .then((response) => {
        setBetterPoolsMetadata(response.data);
      })
      .catch((error) => console.log(error));
  };

  // Use useEffect to load suggestions once when the component mounts
  useEffect(() => {
    loadSuggestions();
  }, []);

  return {
    betterPoolsMetadata,
  };
}
