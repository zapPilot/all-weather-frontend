import { LoadingOutlined } from "@ant-design/icons";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import APRPopOver from "./APRPopOver";

const RebalancerWidget = () => {
  const { data } = useSelector((state) => state.api);
  const getLoadingDom = () => {
    return (
      <>
        <div className="flex justify-items-center items-center h-24">
          <LoadingOutlined className="mx-auto text-5xl" />
        </div>
        <p className="text-base text-center font-semibold leading-5">
          Loading, please wait...
        </p>
      </>
    );
  };
  const getRebalanceDom = () => {
    return (
      <>
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

export default RebalancerWidget;
