// apiSlice.js
import { createSlice } from "@reduxjs/toolkit";

const apiSlice = createSlice({
  name: "api",
  initialState: {
    data: null,
    loading: false,
    error: null,
  },
  reducers: {
    fetchDataStart(state) {
      state.loading = true;
      state.error = null;
    },
    fetchDataSuccess(state, action) {
      state.loading = false;
      // Perform data transformation here
      const transformedData = transformData(action.payload);
      state.data = transformedData;
    },
    fetchDataFailure(state, action) {
      state.loading = false;
      state.error = action.payload;
    },
  },
});

// Helper function for data transformation
const transformData = (data) => {
  // Create a shallow copy of the data object
  const transformedData = { ...data };

  // Transform the net_worth property
  if (transformedData.hasOwnProperty("net_worth")) {
    transformedData.net_worth = parseFloat(transformedData.net_worth).toFixed(
      2,
    );
  }

  return transformedData;
};

export const { fetchDataStart, fetchDataSuccess, fetchDataFailure } =
  apiSlice.actions;
export default apiSlice.reducer;
