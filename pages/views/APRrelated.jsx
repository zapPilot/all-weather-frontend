import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import APRPopOver from "./APRPopOver";

const APRDetails = () => {
  const { data } = useSelector((state) => state.api);
  const getLoadingDom = () => {
    return (
      <>
        <p className="text-base text-center font-semibold leading-5">
          Loading, please wait...
        </p>
      </>
    );
  };
  const getRebalanceDom = () => {
    return (
      <>
        Data updated 1 day ago
        <button
          type="button"
          className="rounded-full bg-indigo-600 p-1 text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="1.5"
            stroke="currentColor"
            class="size-6"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
            />
          </svg>
        </button>
        <div id="zapSection">
          <div>
            <div>
              <h3>
                <APRPopOver />
              </h3>
            </div>
          </div>
        </div>
      </>
    );
  };
  const [renderContent, setRenderContent] = useState(null);

  useEffect(() => {
    if (data) {
      setRenderContent(getRebalanceDom());
    } else {
      setRenderContent(getLoadingDom());
    }
  }, [data]);

  return renderContent;
};

export default APRDetails;
