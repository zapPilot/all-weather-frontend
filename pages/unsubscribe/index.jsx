import logger from "../../utils/logger";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { CheckCircleIcon, XCircleIcon } from "@heroicons/react/20/solid";

const UnsubscribePage = () => {
  const router = useRouter();
  const { email, address } = router.query;
  const [status, setStatus] = useState("loading"); // loading, success, error

  useEffect(() => {
    async function handleUnsubscribe() {
      if (!email || !address) return;

      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_SDK_API_URL}/subscriptions/email`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              address,
              email,
            }),
          },
        );

        if (!response.ok) {
          throw new Error("Failed to unsubscribe");
        }

        setStatus("success");
      } catch (error) {
        logger.error("Unsubscribe error:", error);
        setStatus("error");
      }
    }

    handleUnsubscribe();
  }, [email, address]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="max-w-md w-full mx-auto p-6">
        {status === "loading" && (
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto"></div>
            <p className="mt-4 text-gray-400">
              Processing your unsubscribe request...
            </p>
          </div>
        )}

        {status === "success" && (
          <div className="text-center">
            <CheckCircleIcon className="h-12 w-12 text-emerald-500 mx-auto" />
            <h2 className="mt-4 text-xl font-bold text-white">
              Successfully Unsubscribed
            </h2>
            <p className="mt-2 text-gray-400">
              You have been unsubscribed from Zap Pilot reports.
            </p>
            <button
              onClick={() => router.push("/")}
              className="mt-6 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
            >
              Return to Home
            </button>
          </div>
        )}

        {status === "error" && (
          <div className="text-center">
            <XCircleIcon className="h-12 w-12 text-red-500 mx-auto" />
            <h2 className="mt-4 text-xl font-bold text-white">
              Unsubscribe Failed
            </h2>
            <p className="mt-2 text-gray-400">
              Sorry, we couldn&rsquo;t process your unsubscribe request. Please
              try again later.
            </p>
            <button
              onClick={() => router.push("/")}
              className="mt-6 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
            >
              Return to Home
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default UnsubscribePage;
