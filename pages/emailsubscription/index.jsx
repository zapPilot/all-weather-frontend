import { useState, useEffect } from "react";
import { useActiveAccount } from "thirdweb/react";
import { CheckCircleIcon, XMarkIcon } from "@heroicons/react/20/solid";

const EmailSubscription = () => {
  const account = useActiveAccount();
  const address = account?.address;
  const [email, setEmail] = useState("");
  const [apiStatus, setApiStatus] = useState("");
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    async function checkSubscription() {
      if (!address) return;

      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_SDK_API_URL}/subscriptions?address=${address}`,
        );
        const data = await response.json();
        setIsSubscribed(data.subscriptionStatus === true);
      } catch (error) {
        console.error("Failed to check subscription status:", error);
      }
    }

    checkSubscription();
  }, [address]);

  // If already subscribed, don't show the form
  if (isSubscribed) {
    return null;
  }

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
          subscription: true,
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
    <>
      {apiStatus === "" ? null : (
        <Alert apiStatus={apiStatus} onDismiss={() => setApiStatus("")} />
      )}
      <form className="w-full max-w-md mx-auto">
        <div className="flex items-center justify-center gap-3">
          <input
            id="email-address"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="flex-1 min-w-0 rounded-lg border-0 bg-[#1a1f2e] px-4 py-2.5 text-white placeholder-gray-400 shadow-sm ring-1 ring-inset ring-gray-700/50 focus:ring-2 focus:ring-inset focus:ring-[#10B981] sm:text-sm"
            placeholder="Enter your email"
            value={email}
            onChange={handleEmailChange}
          />
          <button
            type="button"
            onClick={handleUnlock}
            className="shrink-0 rounded-lg bg-[#10B981] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#059669] transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#10B981]"
          >
            Subscribe to Report
          </button>
        </div>
      </form>
    </>
  );
};

const Alert = ({ apiStatus, onDismiss }) => {
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
              onClick={onDismiss}
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
