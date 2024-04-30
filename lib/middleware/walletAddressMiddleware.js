import { fetchSubscriptionStatus } from "../features/subscriptionSlice";

const walletAddressMiddleware = (store) => (next) => (action) => {
  if (action.type === "subscription/walletAddressChanged") {
    const { walletAddress } = action.payload;
    store.dispatch(fetchSubscriptionStatus({ walletAddress }));
  }

  return next(action);
};

export default walletAddressMiddleware;
