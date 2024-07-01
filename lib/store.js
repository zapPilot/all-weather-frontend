import { configureStore } from "@reduxjs/toolkit";
import apiReducer from "./features/apiSlice";
import subscriptionStatusReducer from "./features/subscriptionSlice";
import strategyMetadataReducer from "./features/strategyMetadataSlice";
import walletAddressMiddleware from "./middleware/walletAddressMiddleware";
export const makeStore = () => {
  return configureStore({
    reducer: {
      api: apiReducer,
      subscriptionStatus: subscriptionStatusReducer,
      strategyMetadata: strategyMetadataReducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(walletAddressMiddleware),
  });
};
