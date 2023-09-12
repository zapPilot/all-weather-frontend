import type { NextPage } from "next";
import { useAccount } from "wagmi";
import ExampleUI from "./views/ExampleUI.jsx";
import BasePage from "./basePage.tsx";

const Home: NextPage = () => {
  const { address } = useAccount();
  return (
    <BasePage>
      <ExampleUI address={address} />
    </BasePage>
  );
};

export default Home;
