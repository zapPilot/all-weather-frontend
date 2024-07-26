import BasePage from "../basePage";
import { useEffect, useState } from "react";
import { useActiveAccount } from "thirdweb/react";
import PopUp from "./popUp";
import { Spin } from "antd";
import Link from "next/link";

export default function Example() {
  const account = useActiveAccount();
  const [addresses, setAddresses] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const removeAddress = (address) => {
    setAddresses(addresses.filter((a) => a.address !== address));
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

  return (
    <BasePage>
      <div className="bg-gray-900">
        <div className="mx-auto max-w-7xl">
          <div className="bg-gray-900 py-10">
            <div className="px-4 sm:px-6 lg:px-8">
              <div className="sm:flex sm:items-center">
                <div className="sm:flex-auto">
                  <h1 className="text-base font-semibold leading-6 text-white">
                    Bundle
                  </h1>
                  <p className="mt-2 text-sm text-gray-300">
                    You can create 1 bundle and add up to 10 addresses per
                    bundle!( <Link href="/subscription">Subscription</Link> to
                    create more )
                  </p>
                </div>
                <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
                  <button
                    type="button"
                    className="block rounded-md bg-indigo-500 px-3 py-2 text-center text-sm font-semibold text-white hover:bg-indigo-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
                    onClick={() => setOpen(true)}
                  >
                    Add address
                  </button>
                  <PopUp
                    open={open}
                    setOpen={setOpen}
                    addresses={addresses}
                    setAddresses={setAddresses}
                  />
                </div>
              </div>
              <div className="mt-8 flow-root">
                <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                  <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                    {loading ? (
                      <Spin />
                    ) : (
                      <table className="min-w-full divide-y divide-gray-700">
                        <thead>
                          <tr>
                            <th
                              scope="col"
                              className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-white sm:pl-0"
                            >
                              User
                            </th>
                            <th
                              scope="col"
                              className="relative py-3.5 pl-3 pr-4 sm:pr-0"
                            >
                              <span className="sr-only">Edit</span>
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                          {addresses.map((address) => (
                            <tr key={address.address}>
                              <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-white sm:pl-0">
                                {address.address}
                              </td>
                              <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-0">
                                <button
                                  className="text-indigo-400 hover:text-indigo-300"
                                  onClick={() => removeAddress(address.address)}
                                >
                                  delete
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </BasePage>
  );
}
