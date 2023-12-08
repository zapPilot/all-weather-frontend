import type { NextPage } from "next";
import BasePage from "./basePage.tsx";
import InstallmentCalculator from "./views/InstallmentCalculator.jsx";
import styles from "../styles/Installment.module.css";

const Installment: NextPage = () => {
  return (
    <BasePage>
      <div className={styles.divInstallment}>
        <center>
          <h1>Installment</h1>
        </center>
        <div className={styles.installmentContent}>
          <InstallmentCalculator />
        </div>
      </div>
    </BasePage>
  );
};

export default Installment;
