import { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import { WalletIcon } from "@heroicons/react/20/solid";
import { ethers } from "ethers";
import { useActiveAccount } from "thirdweb/react";
import openNotificationWithIcon from "../../utils/notification.js";
import { notification } from "antd";

export default function PopUpForReferrals({
  open,
  setOpen,
  addresses,
  setAddresses,
  wording,
}) {
  const [inputValue, setInputValue] = useState("");
  const inputValueRef = useRef(inputValue);
  const account = useActiveAccount();
  const [notificationAPI, notificationContextHolder] =
    notification.useNotification();

  useEffect(() => {
    inputValueRef.current = inputValue;
  }, [inputValue]);

  const addReferrer = async (currentInputValue) => {
    try {
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
          "Successfully add referrer, happy earning",
        );
      } else {
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

  const handleAddAddress = async () => {
    const currentInputValue = inputValueRef.current;
    if (ethers.utils.isAddress(currentInputValue)) {
      await addReferrer(currentInputValue);
      setInputValue("");
    } else {
      openNotificationWithIcon(
        notificationAPI,
        "Referral Program",
        "error",
        `Invalid Address: ${currentInputValue}`,
      );
    }
  };

  return (
    <Dialog
      open={open === undefined ? false : open}
      onClose={() => setOpen(false)}
      className="relative z-10"
    >
      {notificationContextHolder}
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity data-[closed]:opacity-0 data-[enter]:duration-300 data-[leave]:duration-200 data-[enter]:ease-out data-[leave]:ease-in"
      />

      <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
        <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
          <DialogPanel
            transition
            className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all data-[closed]:translate-y-4 data-[closed]:opacity-0 data-[enter]:duration-300 data-[leave]:duration-200 data-[enter]:ease-out data-[leave]:ease-in sm:my-8 sm:w-full sm:max-w-sm sm:p-6 data-[closed]:sm:translate-y-0 data-[closed]:sm:scale-95"
          >
            <div>
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                <WalletIcon
                  aria-hidden="true"
                  className="h-6 w-6 text-green-600"
                />
              </div>
              <div className="mt-3 text-center sm:mt-5">
                <DialogTitle
                  as="h3"
                  className="text-base font-semibold leading-6 text-gray-900"
                >
                  {wording}
                </DialogTitle>
                <AddressInput
                  inputValue={inputValue}
                  setInputValue={setInputValue}
                />
              </div>
            </div>
            <div className="mt-5 sm:mt-6">
              <button
                type="button"
                onClick={handleAddAddress}
                className="w-full justify-center rounded-md bg-emerald-400 px-3 py-2 text-sm font-semibold text-black hover:bg-emerald-300"
              >
                Add
              </button>
            </div>
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
}

const AddressInput = ({ inputValue, setInputValue }) => {
  const handleInputChange = (e) => {
    setInputValue(e.target.value.toLowerCase());
  };

  return (
    <div>
      <div className="relative mt-2 rounded-md shadow-sm">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <WalletIcon aria-hidden="true" className="h-5 w-5 text-gray-400" />
        </div>
        <input
          id="address"
          name="address"
          type="text"
          value={inputValue}
          placeholder="0xabcd...efg"
          className="block w-full rounded-md border-0 py-1.5 pl-10 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
          onChange={handleInputChange}
        />
      </div>
    </div>
  );
};
