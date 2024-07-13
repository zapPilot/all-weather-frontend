import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { getPortfolioHelper } from "../../utils/thirdwebSmartWallet.ts";

// createAsyncThunk function to fetch the subscription status
export const fetchStrategyMetadata = createAsyncThunk(
  "strategyMetadata/fetchStrategyMetadata",
  async () => {
    const portofolioHelper = getPortfolioHelper("AllWeatherPortfolio");
    await portofolioHelper.initialize();
    return {
      strategyMetadata: portofolioHelper.strategyMetadata,
      existingInvestmentPositions: portofolioHelper.existingInvestmentPositions,
    };
  },
);

const strategyMetadataSlice = createSlice({
  name: "strategyMetadata",
  // initial state of the subscription slice
  initialState: {
    strategyMetadata: {},
    loading: false,
    error: null,
  },
  reducers: {},
  // process the fetchStrategyMetadata action
  extraReducers: (builder) => {
    builder
      .addCase(fetchStrategyMetadata.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchStrategyMetadata.fulfilled, (state, action) => {
        state.loading = false;
        state.strategyMetadata = action.payload;
      })
      .addCase(fetchStrategyMetadata.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      });
  },
});

export default strategyMetadataSlice.reducer;
