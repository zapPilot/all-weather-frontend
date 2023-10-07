import type { NextPage } from "next";
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
