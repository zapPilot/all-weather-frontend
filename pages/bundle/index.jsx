import { useEffect, useState } from "react";
import { useActiveAccount } from "thirdweb/react";
import PopUp from "./popUp";
import Link from "next/link";

export default function Bundle() {
  const account = useActiveAccount();
  const [addresses, setAddresses] = useState([]);
  const [addressAcount, setAddressAccount] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [confirmModal, setConfirmModal] = useState(false);
  const [confirmAddress, setConfirmAddress] = useState("");
  const removeAddress = (address) => {
    setConfirmModal(false);
    setAddresses(addresses.filter((a) => a.address !== address));
  };

  const confirmRemove = (address) => {
    setConfirmAddress(address);
    setConfirmModal(true);
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!account) return;
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/bundle/${account.address}`,
        );
        const data = await response.json();
        setAddresses(data);
        setLoading(false);
      } catch (error) {
        console.error(error);
      }
    };
    fetchData();
  }, [account]);

  useEffect(() => {
    if (addresses.length > 0) {
      setAddressAccount(addresses.length);
    }
  }, [addresses]);

  return (
    <>
      <div className="px-4 py-8">
        <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Bundle
        </h1>
        <p className="text-xl text-gray-400">
          {addressAcount} addresses added
          <button
            className="ms-2 text-emerald-400 hover:text-emerald-300"
            onClick={() => setOpen(true)}
          >
            + Add address
          </button>
        </p>
        <div className="mt-2 flex items-center justify-between">
          <p className="text-base text-gray-400">
            You can create 1 bundle and add up to 10 addresses per bundle!
          </p>
          <div>
            <Link
              className="text-base text-emerald-400 hover:text-emerald-300"
              href="/subscription"
            >
              Subscription
            </Link>
            <span className="text-base text-gray-400"> to create more</span>
          </div>
        </div>
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
                    User
                  </th>
                  <th scope="col"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-400">
                {addresses.map((address) => (
                  <tr key={address.address}>
                    <td className="whitespace-nowrap px-2 py-4 text-sm font-medium text-white">
                      <p
                        className="max-w-64 sm:max-w-full truncate"
                        role="address"
                      >
                        {address.address}
                      </p>
                    </td>
                    <td className="whitespace-nowrap px-2 py-4 text-right text-sm font-medium">
                      <button
                        className="text-rose-500 hover:text-rose-400"
                        onClick={() => confirmRemove(address.address)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
      <PopUp
        open={open}
        setOpen={setOpen}
        addresses={addresses}
        setAddresses={setAddresses}
      />
      {confirmModal ? (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity">
          <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
            <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
              <div className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl">
                <div className="sm:flex sm:items-start">
                  <div className="mt-2">
                    <h3 className="text-base font-semibold leading-6 text-gray-900">
                      Are you sure you want to remove
                    </h3>
                    <p className="text-rose-500">{confirmAddress}</p>
                  </div>
                </div>
                <div className="mt-4 flex flex-row-reverse">
                  <button
                    type="button"
                    onClick={() => removeAddress(confirmAddress)}
                    className="inline-flex w-full justify-center rounded-md bg-rose-500 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-rose-400 sm:ml-3 sm:w-auto"
                  >
                    Remove
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmModal(false)}
                    className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
