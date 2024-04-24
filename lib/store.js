import { configureStore } from "@reduxjs/toolkit";
import apiReducer from "./features/apiSlice";
import subscriptionStatusReducer from "./features/subscriptionSlice";
export const makeStore = () => {
  return configureStore({
    reducer: {
      api: apiReducer,
      subscription: subscriptionStatusReducer,
    },
  });
};
