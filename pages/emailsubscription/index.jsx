import { useState } from "react";
import BasePage from "../basePage";
import { useAddress } from "@thirdweb-dev/react";
import { CheckCircleIcon, XMarkIcon } from "@heroicons/react/20/solid";

const EmailSubscription = () => {
  const address = useAddress();
  const [email, setEmail] = useState("");
  const [apiStatus, setApiStatus] = useState("");

  async function handleUnlock() {
    if (email === "" || typeof address === "undefined") {
      setApiStatus("Email and address are required!");
      return;
    }
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SDK_API_URL}/subscriptions/email`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          address,
          email,
        }),
      },
    );
    const resp = await response.json();
    setApiStatus(resp.status);
  }

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
  };

  return (
    <BasePage>
      {apiStatus === "" ? null : <Alert apiStatus={apiStatus} />}
      <div className="bg-white py-16 sm:py-24">
        <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
          <div className="relative isolate flex flex-col gap-10 overflow-hidden bg-gray-900 px-6 py-24 shadow-2xl sm:rounded-3xl sm:px-24 xl:flex-row xl:items-center xl:py-32">
            <h2 className="max-w-2xl text-3xl font-bold tracking-tight text-white sm:text-4xl xl:max-w-none xl:flex-auto">
              Unlock Advanced Features with Your Email!
            </h2>
            <form className="w-full max-w-md">
              <div className="flex gap-x-4">
                <label htmlFor="email-address" className="sr-only">
                  Email address
                </label>
                <input
                  id="email-address"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="min-w-0 flex-auto rounded-md border-0 bg-white/5 px-3.5 py-2 text-white shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset focus:ring-white sm:text-sm sm:leading-6"
                  placeholder="Enter your email"
                  value={email}
                  onChange={handleEmailChange}
                />
                <button
                  type="button"
                  onClick={handleUnlock}
                  className="flex-none rounded-md bg-white px-3.5 py-2.5 text-sm font-semibold text-gray-900 shadow-sm hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  Unlock
                </button>
              </div>
              <p className="mt-4 text-sm leading-6 text-gray-300">
                We care about your data. Read our{" "}
                <a href="#" className="font-semibold text-white">
                  privacy&nbsp;policy
                </a>
                .
              </p>
            </form>
            <svg
              viewBox="0 0 1024 1024"
              className="absolute left-1/2 top-1/2 -z-10 h-[64rem] w-[64rem] -translate-x-1/2"
              aria-hidden="true"
            >
              <circle
                cx={512}
                cy={512}
                r={512}
                fill="url(#759c1415-0410-454c-8f7c-9a820de03641)"
                fillOpacity="0.7"
              />
              <defs>
                <radialGradient
                  id="759c1415-0410-454c-8f7c-9a820de03641"
                  cx={0}
                  cy={0}
                  r={1}
                  gradientUnits="userSpaceOnUse"
                  gradientTransform="translate(512 512) rotate(90) scale(512)"
                >
                  <stop stopColor="#7775D6" />
                  <stop offset={1} stopColor="#E935C1" stopOpacity={0} />
                </radialGradient>
              </defs>
            </svg>
          </div>
        </div>
      </div>
    </BasePage>
  );
};

const Alert = ({ apiStatus }) => {
  return (
    <div className={`rounded-md bg-green-50 p-4`}>
      <div className="flex">
        <div className="flex-shrink-0">
          <CheckCircleIcon
            className={`h-5 w-5 text-green-400`}
            aria-hidden="true"
          />
        </div>
        <div className="ml-3">
          <p className={`text-sm font-medium text-green-800`}>{apiStatus}</p>
        </div>
        <div className="ml-auto pl-3">
          <div className="-mx-1.5 -my-1.5">
            <button
              type="button"
              className={`inline-flex rounded-md bg-green-50 p-1.5 text-green-500 hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2 focus:ring-offset-green-50`}
            >
              <span className="sr-only">Dismiss</span>
              <XMarkIcon className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailSubscription;
