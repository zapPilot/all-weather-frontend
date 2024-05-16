//@ts-nocheck
// All code in this file will be ignored by the TypeScript compiler
import React, { useState, useEffect } from "react";
import { Popover, Spin } from "antd";
import { useSelector } from "react-redux";

const APRPopOver = () => {
  const { data, loading } = useSelector((state) => state.api);
  const [missingPools, setMissingPools] = useState([]);
  const [open, setOpen] = useState(false);
  const hide = () => {
    setOpen(false);
  };
  const handleOpenChange = (newOpen) => {
    setOpen(newOpen);
  };

  useEffect(() => {
    if (loading) return;
    let tmpMissingPools = [];
    for (const pool of Object.values(data.aggregated_positions)) {
      if (pool.apr.success === false) {
        tmpMissingPools.push(pool);
      }
    }
    setMissingPools(tmpMissingPools);
  }, [data, loading]);

  if (loading)
    return (
      <center>
        <Spin size="small" />
        Loading...
      </center>
    );
  return (
    <Popover
      content={<a onClick={hide}>Close</a>}
      title="Title"
      trigger="click"
      open={open}
      onOpenChange={handleOpenChange}
    >
      <a>
        {missingPools.length > 0 ? (
          <span className="inline-flex items-center gap-x-1.5 rounded-md px-2 py-1 text-xs font-medium text-white ring-1 ring-inset ring-gray-800">
            <svg
              className="h-1.5 w-1.5 fill-red-400"
              viewBox="0 0 6 6"
              aria-hidden="true"
            >
              <circle cx={3} cy={3} r={3} />
            </svg>
            Missing {missingPools.length} Pools
          </span>
        ) : (
          <span className="inline-flex items-center gap-x-1.5 rounded-md px-2 py-1 text-xs font-medium text-white ring-1 ring-inset ring-gray-800">
            <svg
              className="h-1.5 w-1.5 fill-green-400"
              viewBox="0 0 6 6"
              aria-hidden="true"
            >
              <circle cx={3} cy={3} r={3} />
            </svg>
            APR Details
          </span>
        )}
      </a>
    </Popover>
  );
};

export default APRPopOver;
