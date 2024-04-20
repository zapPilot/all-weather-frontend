import { configureStore } from "@reduxjs/toolkit";
import apiReducer from "./features/apiSlice";
export const makeStore = () => {
  return configureStore({
    reducer: {
      api: apiReducer,
    },
  });
};
