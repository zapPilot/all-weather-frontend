import { isLocalEnvironment } from "../utils/general";

// Use lower thresholds for local development
export const MINIMUM_PROTOCOL_ZAP_IN_USD_THRESHOLD = isLocalEnvironment
  ? 0.5
  : 3;
export const MINIMUM_BRIDGE_USD_THRESHOLD = isLocalEnvironment ? 5 : 20;
export const MINIMUM_CLAIM_AMOUNT = 1;
