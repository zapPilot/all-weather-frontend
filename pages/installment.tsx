import type { NextPage } from "next";
import BasePage from "./basePage.tsx";
import InstallmentCalculator from "./views/InstallmentCalculator.jsx"


const Installment : NextPage = () => {
  
  const colorWhite = {
    color: 'white'
  };
  
  return (
    <BasePage>
      <center style={colorWhite}>
        <h1>Installment</h1>
      </center>
      <div style={colorWhite}>
        <InstallmentCalculator />
      </div>
    </BasePage>
  );
};

export default Installment