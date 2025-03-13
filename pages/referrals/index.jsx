import { useEffect, useState } from "react";
import { useActiveAccount } from "thirdweb/react";
import BasePage from "../basePage";
import CopyableReferralButton from "./copyableReferralButton.jsx";
import { notification } from "antd";
import openNotificationWithIcon from "../../utils/notification.js";
import { Fragment } from "react";
import axios from "axios";
import ImageWithFallback from "../basicComponents/ImageWithFallback";
import PopUpForReferrals from "./PopUpForReferrals";
import content from "../../config/content";
export default function Referrals() {
  const account = useActiveAccount();
  const [referees, setReferees] = useState([]);
  const [referrer, setReferrer] = useState("");
  const [addressAccount, setAddressAccount] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [referralFeeDict, setReferralFeeDict] = useState({});
  const [referralFeeTxns, setReferralFeeTxns] = useState({});
  const [referralFeeByTokenByReferee, setReferralFeeByTokenByReferee] =
    useState({});
  const [notificationAPI, notificationContextHolder] =
    notification.useNotification();

  useEffect(() => {
    const fetchData = async () => {
      if (!account) return;
      try {
        const response = await fetch(
          `${
            process.env.NEXT_PUBLIC_SDK_API_URL
          }/referral/${account.address.toLowerCase()}/referees`,
        );
        const data = await response.json();

        setReferees(data.referees);
        setReferrer(data.referrer);
        if (data.referees.length > 0) {
          setAddressAccount(data.referees.length);
        }

        setLoading(false);
      } catch (error) {
        openNotificationWithIcon(
          notificationAPI,
          "Referral Program",
          "error",
          `Failed to load referees: ${error}`,
        );
      }
    };
    fetchData();
  }, [account]);

  useEffect(() => {
    async function fetchTransactionHistory(referee) {
      const resp = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/transaction/category/${referee}`,
      );
      let localReferralFeeDict = {};
      let localReferralFeeByTokenByReferee = {};
      localReferralFeeByTokenByReferee[referee] = {};
      let referralFeeTxns = [];
      for (const txn of resp.data.transactions) {
        const principalSymbol =
          txn.metadata.tokenSymbol.includes("usd") ||
          txn.metadata.tokenSymbol.includes("dai")
            ? "usd"
            : txn.metadata.tokenSymbol;
        const swapFeeRate = txn.metadata.swapFeeRate || 0;
        const referralFeeRate = txn.metadata.referralFeeRate || 0;
        let amount = 0;
        if (txn.metadata.actionName === "zapIn") {
          amount = parseFloat(txn.metadata.investmentAmount) || 0;
        } else if (txn.metadata.actionName === "zapOut") {
          amount = parseFloat(txn.metadata.zapOutAmount) || 0;
        }
        const referralFee = amount * swapFeeRate * referralFeeRate;
        if (referralFee === 0) continue;
        localReferralFeeDict = {
          ...localReferralFeeDict,
          [principalSymbol]:
            (localReferralFeeDict[principalSymbol] || 0) + referralFee,
        };
        referralFeeTxns.push({
          tx_hash: txn.tx_hash,
          referralFee,
          referee,
          tokenSymbol: txn.metadata.tokenSymbol,
        });
        localReferralFeeByTokenByReferee[referee] = {
          ...localReferralFeeByTokenByReferee[referee],
          [principalSymbol]:
            (localReferralFeeByTokenByReferee[referee][principalSymbol] || 0) +
            referralFee,
        };
      }
      // merge the local referral fee dict with the global referral fee dict
      setReferralFeeDict((prev) => {
        return {
          ...prev,
          ...localReferralFeeDict,
        };
      });
      // put the transactions array into a Map with referee as key
      setReferralFeeTxns((prev) => {
        return {
          ...prev,
          [referee]: referralFeeTxns,
        };
      });
      setReferralFeeByTokenByReferee((prev) => {
        return {
          ...prev,
          ...localReferralFeeByTokenByReferee,
        };
      });
    }
    for (const { referee } of referees) {
      fetchTransactionHistory(referee);
    }
  }, [referees]);

  // const referralFeeTxns1 = {"0x7db9fa61762af0d4456c2822fa2d85e1760b9ddd":[],"0xc774806f9ff5f3d8aabb6b70d0ed509e42afe6f0":[{"tx_hash":"0x7d022c58deaaa995f59f778ebf0cb8f2a2c0affdfa183eb723a7494ec7da9847","referralFee":0.00207627693,"referee":"0xc774806f9ff5f3d8aabb6b70d0ed509e42afe6f0", "tokenSymbol":"usdc"}]}

  return (
    <BasePage>
      {notificationContextHolder}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Referrals – Earn 70% of the transaction fee with each referral{" "}
        </h1>
        <p className="text-xl text-gray-400">
          - {addressAccount} {addressAccount > 1 ? "referrals" : "referral"}
          {referrer !== "" ? (
            <div>- referred by {referrer}</div>
          ) : (
            <button
              className="ms-2 text-emerald-400 hover:text-emerald-300"
              onClick={() => setOpen(true)}
            >
              + Add Referrer {referrer}
            </button>
          )}
          - Total Referral Fee{" "}
          {Object.entries(referralFeeDict || {}).map(
            ([tokenSymbol, referralFee], idx) => (
              <div
                key={tokenSymbol}
                style={{
                  display: "flex",
                  alignItems: "center",
                  marginBottom: "8px",
                }}
              >
                <span style={{ marginRight: "8px" }}>{referralFee}</span>
                <ImageWithFallback
                  token={tokenSymbol}
                  height={20}
                  width={20}
                  domKey={idx}
                />
              </div>
            ),
          )}
          <CopyableReferralButton
            referralLink={`${content.siteInfo.tagline} 🚀 Join All Weather Protocol using this link:  https://all-weather-protocol.on-fleek.app?referrer=${account?.address}`}
          />
        </p>
      </div>
      <div>
        {/* copy from https://tailwindui.com/components/application-ui/lists/tables#component-cea1008f50f1be6ef8487094592cde62 */}
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="mx-auto max-w-2xl text-base font-semibold leading-6 text-gray-900 lg:mx-0 lg:max-w-none">
            Recent activity
          </h2>
        </div>
        <div className="mt-6 overflow-hidden border-t border-gray-100">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl lg:mx-0 lg:max-w-none">
              <table className="w-full text-left">
                <thead className="sr-only bg-emerald-400">
                  <tr>
                    <th>Amount</th>
                    <th className="hidden sm:table-cell">Client</th>
                    <th>More details</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(referralFeeTxns).map(
                    ([referee, txns], index) => {
                      if (txns.length === 0) return null;
                      return (
                        <Fragment key={index}>
                          <tr className="text-sm leading-6 text-gray-900">
                            <th
                              scope="colgroup"
                              colSpan={3}
                              className="relative isolate py-2 font-semibold"
                            >
                              Referral Fees
                              <div className="absolute inset-y-0 right-full -z-10 w-screen border-b border-gray-200 bg-emerald-400" />
                              <div className="absolute inset-y-0 left-0 -z-10 w-screen border-b border-gray-200 bg-emerald-400" />
                            </th>
                          </tr>
                          {txns.map((txn, idx) => (
                            <tr key={txn.tx_hash}>
                              <td className="relative py-5 pr-6">
                                <div className="flex gap-x-6">
                                  <div className="flex-auto">
                                    <div className="flex items-start gap-x-3">
                                      <div className="text-sm font-medium leading-6 text-white">
                                        {txn.referralFee}
                                      </div>
                                      <ImageWithFallback
                                        token={txn.tokenSymbol}
                                        height={20}
                                        width={20}
                                        domKey={idx}
                                      />
                                    </div>
                                  </div>
                                </div>
                                <div className="absolute bottom-0 right-full h-px w-screen bg-gray-100" />
                                <div className="absolute bottom-0 left-0 h-px w-screen bg-gray-100" />
                              </td>
                              <td className="hidden py-5 pr-6 sm:table-cell">
                                <div className="text-sm leading-6 text-white">
                                  referee:
                                </div>
                                <div className="mt-1 text-xs leading-5 text-white">
                                  {referee}
                                </div>
                              </td>
                              <td className="py-5 text-right">
                                <div className="flex justify-end">
                                  <a
                                    href={`https://arbitrum.blockscout.com/tx/${txn.tx_hash}`}
                                    className="text-sm font-medium leading-6 text-indigo-600 hover:text-indigo-500"
                                    target="_blank"
                                  >
                                    View
                                    <span className="hidden sm:inline">
                                      {" "}
                                      Transaction
                                    </span>
                                    <span className="sr-only">
                                      {txn.tx_hash}
                                    </span>
                                  </a>
                                </div>
                                <div className="mt-1 text-xs leading-5 text-white">
                                  tx:{" "}
                                  <span className="text-white">
                                    {txn.tx_hash.slice(0, 4) +
                                      "..." +
                                      txn.tx_hash.slice(-4)}
                                  </span>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </Fragment>
                      );
                    },
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-8">
        <div className="mt-8">
          {loading ? (
            <div className="flex items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-t-emerald-400"></div>
            </div>
          ) : (
            <table className="min-w-full">
              <thead className="bg-emerald-400">
                <tr className="bg-emerald-400">
                  <th
                    scope="col"
                    className="px-2 py-4 text-left text-sm font-semibold text-black"
                  >
                    Referee
                  </th>
                  <th
                    scope="col"
                    className="px-2 py-4 text-left text-sm font-semibold text-black"
                  >
                    Referral Fees
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-400">
                {referees.map((address) => (
                  <tr key={address.address}>
                    <td className="whitespace-nowrap px-2 py-4 text-sm font-medium text-gray-500">
                      <p
                        className="max-w-64 sm:max-w-full truncate"
                        role="address"
                      >
                        {address.referee}
                      </p>
                    </td>
                    <td className="whitespace-nowrap px-2 py-4 text-sm text-white">
                      {Object.entries(
                        referralFeeByTokenByReferee[address.referee] || {},
                      ).map(([tokenSymbol, referralFee], idx) => (
                        <div
                          key={tokenSymbol}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            marginBottom: "8px",
                          }}
                        >
                          <span style={{ marginRight: "8px" }}>
                            {referralFee}
                          </span>
                          <ImageWithFallback
                            token={tokenSymbol}
                            height={20}
                            width={20}
                            domKey={idx}
                          />
                        </div>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
      <PopUpForReferrals
        open={open}
        setOpen={setOpen}
        referees={referees}
        setReferees={setReferees}
        wording="Add Referrer"
      />
    </BasePage>
  );
}
