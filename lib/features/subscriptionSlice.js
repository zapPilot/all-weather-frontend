import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

// createAsyncThunk function to fetch the subscription status
export const fetchSubscriptionStatus = createAsyncThunk(
  "subscription/fetchSubscriptionStatus",
  async ({ walletAddress }) => {
    // get the subscription status from the API
    const url = `${process.env.NEXT_PUBLIC_SDK_API_URL}/subscriptions?address=${walletAddress}`;
    const response = await fetch(url);
    const data = await response.json();
    return data.subscriptionStatus;
  },
);

const subscriptionSlice = createSlice({
  name: "subscription",
  // initial state of the subscription slice
  initialState: {
    subscriptionStatus: false,
    loading: false,
    error: null,
  },
  reducers: {},
  // process the fetchSubscriptionStatus action
  extraReducers: (builder) => {
    builder
      .addCase(fetchSubscriptionStatus.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSubscriptionStatus.fulfilled, (state, action) => {
        state.loading = false;
        state.subscriptionStatus = action.payload;
      })
      .addCase(fetchSubscriptionStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      });
  },
});

export default subscriptionSlice.reducer;
