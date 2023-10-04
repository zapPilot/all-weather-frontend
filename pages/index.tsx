import type { NextPage } from "next";
import { useAccount } from "wagmi";
import ExampleUI from "./views/ExampleUI.jsx";
import BasePage from "./basePage.tsx";

const Home: NextPage = () => {
  return (
    <BasePage>
      <ExampleUI />
    </BasePage>
  );
};

export default Home;
