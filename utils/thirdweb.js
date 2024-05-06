import { createThirdwebClient } from "thirdweb";
const THIRDWEB_CLIENT = createThirdwebClient({
  clientId: String(process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID),
});

export default THIRDWEB_CLIENT;
