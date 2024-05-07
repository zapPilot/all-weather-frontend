import React, { useState } from 'react';
import { PlusCircleOutlined } from "@ant-design/icons";

export const ExpandTableComponent = ({ column, columnData, expandedRowRender }) => {
  const [expandedRows, setExpandedRows] = useState(false);

  const toggleExpand = (rowKey) => {
    setExpandedRows((prevExpandedRows) => {
      const isExpanded = prevExpandedRows[rowKey];
      return {
        ...prevExpandedRows,
        [rowKey]: !isExpanded,
      };
    });
  };

  return (
    <>
      <table className="min-w-full hidden sm:table">
        <thead>
          <tr className="bg-emerald-400">
            <th></th>
            {column.map((item, index) => (
              <th
                key={index}
                className="px-3 py-3.5 text-left text-sm font-semibold text-black"
              >
                {item.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-400">
          {columnData.map((item, rowIndex) => (
            <>
              <tr
                key={rowIndex}
                className="hover:bg-black-900 cursor-pointer"
                onClick={
                  // @ts-ignore
                  () => toggleExpand(item.tokens)
                }
              >
                <td>
                  <PlusCircleOutlined />
                </td>
                {column.map((column, colIndex) => (
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-400">
                    {column.render(item[column.key])}
                  </td>
                ))}
              </tr>
              <tr>
                {
                  expandedRows[item.tokens] && (
                    <td colSpan="3">{expandedRowRender(item)}</td>
                  )
                }
              </tr>
            </>
          ))}
        </tbody>
      </table>
      <table className="min-w-full sm:hidden">
        <thead>
          <tr className="bg-emerald-400">
            <th></th>
            {column.map((item, index) => (
              <th
                key={index}
                className="px-3 py-3.5 text-left text-sm font-semibold text-black"
              >
                {item.title}m
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-400">
          {columnData.map((item, rowIndex) => (
            <>
              <tr
                key={rowIndex}
                className="hover:bg-black-900 cursor-pointer"
                onClick={
                  // @ts-ignore
                  () => toggleExpand(item.tokens)
                }
              >
                <td>
                  <PlusCircleOutlined />
                </td>
                {column.map((column, colIndex) => (
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-400">
                    {column.render(item[column.key])}
                  </td>
                ))}
              </tr>
              <tr>
                {
                  expandedRows[item.tokens] && (
                    <td colSpan="3">{expandedRowRender(item)}</td>
                  )
                }
              </tr>
            </>
          ))}
        </tbody>
      </table>
    </>
    
  );
};

export const TableComponent = ({ column, columnData }) => {
  const tableRowMobile = ["Tokens", "Chain", "Pool", "TVL", "APR"];
  return (
    <>
      <table className="min-w-full hidden sm:table">
        <thead>
          <tr className="bg-white">
            <th
              scope="col"
              className="w-12"
            ></th>
            {column.map((item, index) => (
              <th
                key={index}
                className="px-3 py-3.5 text-left text-sm font-semibold text-black"
              >
                {item.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-400">
          {columnData.data.map((item, index) => (
            <tr key={index} className="hover:bg-black-900 cursor-pointer">
              <td className="relative px-7 sm:w-12 sm:px-6">
                <input
                  type="checkbox"
                  className="absolute left-4 top-1/2 -mt-2 h-4 w-4 rounded border-gray-400 text-indigo-600 focus:ring-indigo-600"
                  onChange={(e) =>
                    e.target.checked ? onSelectCallback(item, true) : null
                  }
                />
              </td>
              {column.map((column, colIndex) => (
                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-400">
                  {column.render(item[column.key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <table className="min-w-full sm:hidden">
        <thead>
          <tr className="bg-white">
            <th
              scope="col"
              className="w-12"
            ></th>
            <th className="px-3 py-3.5 text-left text-sm font-semibold text-black">Pool</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-400">
        {columnData.data.map((item, index) => (
          <tr key={index} className="hover:bg-black-900 cursor-pointer">
            <td className="relative px-7 sm:w-12 sm:px-6">
              <input
                type="checkbox"
                className="absolute left-4 top-1/2 -mt-2 h-4 w-4 rounded border-gray-400 text-indigo-600 focus:ring-indigo-600"
                onChange={(e) =>
                  e.target.checked ? onSelectCallback(item, true) : null
                }
              />
            </td>
            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-400">
              <div className="grid grid-cols-2 gap-4 sm:hidden">
                {tableRowMobile.map((title, colIndex) => {
                  const columnItem = column.find(col => col.title === title);
                  if (!columnItem) return null;
                  const isTokens = columnItem.title === "Tokens";
                  return (
                    <div key={colIndex} className={isTokens ? "col-span-2" : "col-span-1"}>
                    {isTokens ? (
                      <>
                        <div className="text-white text-xl font-medium px-2">
                          {columnItem.render(item[columnItem.key])}
                        </div>
                      </>
                    ) : (
                      <>
                        <p className="text-gray-400 text-sm font-medium">{columnItem.title}</p>
                        <div className="w-36 text-wrap">
                          {columnItem.render(item[columnItem.key])}
                        </div>
                      </>
                    
                    )}
                  </div>
                  );
                })}
              </div>
            </td>
          </tr>
        ))}
        </tbody>
      </table>
    </>
  );
};