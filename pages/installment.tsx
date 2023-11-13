import type { NextPage } from "next";
import BasePage from "./basePage.tsx";
import InstallmentCalculator from "./views/InstallmentCalculator.jsx"

const Installment : NextPage = () => {
  const divInstallment = {
    margin: '100px 0'
  }

  return (
    <BasePage>
      <div style={{color: 'white'}}>
        <center>
          <h1>Installment</h1>
        </center>
        <div style={divInstallment}>
          <InstallmentCalculator />
        </div>
      </div>
    </BasePage>
  );
};

export default Installment