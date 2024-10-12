import { useEffect, useState } from "react";
import { useActiveAccount } from "thirdweb/react";
import PopUpForReferrals from "./PopUpForReferrals";
import BasePage from "../basePage";
import CopyableReferralButton from "./copyableReferralButton.jsx";
import { useRouter } from "next/router";
import { notification } from "antd";
import openNotificationWithIcon from "../../utils/notification.js";

export default function Referrals() {
  const router = useRouter();

  const account = useActiveAccount();
  const [referees, setReferees] = useState([]);
  const [referrer, setReferrer] = useState("");
  const [addressAccount, setAddressAccount] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
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
        return data;
      } catch (error) {
        openNotificationWithIcon(
          notificationAPI,
          "Referral Program",
          "error",
          `Failed to load referees: ${error}`,
        );
      }
    };
    const addReferrer = async (currentInputValue) => {
      try {
        if (!account) return;
        const response = await fetch(
          `${
            process.env.NEXT_PUBLIC_SDK_API_URL
          }/referral/${account.address.toLowerCase()}/referrer`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              referrer: currentInputValue.toLowerCase(),
            }),
          },
        );
        const resp = await response.json();
        if (response.ok) {
          openNotificationWithIcon(
            notificationAPI,
            "Referral Program",
            "success",
            `Successfully add referrer ${currentInputValue.toLowerCase()}, happy earning`,
          );
        } else if (
          resp.status !==
          "Referrer Already Exists! Or Your referrer cannot be referred by you"
        ) {
          openNotificationWithIcon(
            notificationAPI,
            "Referral Program",
            "error",
            `Failed: ${resp.status}`,
          );
        }
      } catch (error) {
        openNotificationWithIcon(
          notificationAPI,
          "Referral Program",
          "error",
          `Failed: ${error.message}`,
        );
      }
    };
    const referralData = fetchData();
    if (!router.isReady || referralData.referrer !== "") return;

    const { referrer: referrerParam } = router.query;
    if (referrerParam) {
      setReferrer(referrerParam);
      addReferrer(referrerParam);
    }
  }, [router, account]);

  return (
    <BasePage>
      {notificationContextHolder}
      <div className="px-4 py-8">
        <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Referrals
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
          <CopyableReferralButton
            referralLink={`Click Once, Yield Forever! 🚀 Join All Weather Protocol using this link:  https://all-weather-protocol.on-fleek.app/referrals?referrer=${account?.address}`}
          />
        </p>
        <div className="mt-8">
          {loading ? (
            <div className="flex items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-t-emerald-400"></div>
            </div>
          ) : (
            <table className="min-w-full">
              <thead>
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
                    Commision Rebate
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
                      placeholder
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
