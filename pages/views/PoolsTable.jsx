import React, { useState, memo } from "react";
import PropTypes from "prop-types";
import { PlusCircleIcon } from "../../utils/icons.jsx";
const ExpandTableComponent = ({
  column,
  columnData,
  expandedRowRender,
  webView,
}) => {
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
      <table
        className={`min-w-full ${webView ? "hidden sm:table" : "sm:hidden"}`}
        key="expand_table"
      >
        <thead>
          <tr className="bg-emerald-400">
            <th></th>
            {column.map((item, index) => (
              <th
                key={`${item.title}-${index}`}
                className="px-3 py-3.5 text-left text-sm font-semibold text-black"
              >
                {item.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-400" key="toggle_table">
          {columnData.map((item, rowIndex) => (
            <>
              <tr
                key={`${item.tokens.join("-")}-${rowIndex}`}
                className="hover:bg-black-900 cursor-pointer"
                onClick={
                  // @ts-ignore
                  () => toggleExpand(item.tokens)
                }
              >
                <td>
                  <PlusCircleIcon />
                </td>
                {column.map((column, colIndex) => (
                  <td
                    className="whitespace-nowrap px-3 py-4 text-sm text-gray-400"
                    key={`${column.key}-${item.tokens.join("-")}-${colIndex}`}
                  >
                    {column.render(item[column.key])}
                  </td>
                ))}
              </tr>
              <tr>
                {expandedRows[item.tokens] && (
                  <td colSpan="3">{expandedRowRender(item)}</td>
                )}
              </tr>
            </>
          ))}
        </tbody>
      </table>
    </>
  );
};

const TableComponent = ({ column, columnData, webView, onSelectCallback }) => {
  const tableRowMobile = ["Tokens", "Chain", "Pool", "TVL", "APR"];
  const columnDataArray = Array.isArray(columnData)
    ? columnData
    : columnData.data;
  return (
    <>
      <table
        className={`min-w-full ${webView ? "hidden sm:table" : "sm:hidden"}`}
        key="table"
      >
        <thead>
          <tr className="bg-white">
            <th scope="col" className="w-12"></th>
            {webView ? <WebTableThead column={column} /> : <MobileTableThead />}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-400" key="regular_table">
          {columnDataArray.map((item, index) => (
            <tr
              key={item.pool.poolID}
              className="hover:bg-black-900 cursor-pointer"
            >
              <td className="relative px-7 sm:w-12 sm:px-6">
                <input
                  type="checkbox"
                  className="absolute left-4 top-1/2 -mt-2 h-4 w-4 rounded border-gray-400 text-indigo-600 focus:ring-indigo-600"
                  onChange={(e) => onSelectCallback(item, e.target.checked)}
                />
              </td>
              {webView ? (
                <WebTableBody column={column} item={item} rowIndex={index} />
              ) : (
                <MobileTableBody
                  column={column}
                  item={item}
                  tableRowMobile={tableRowMobile}
                  rowIndex={index}
                />
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
};

TableComponent.propTypes = {
  column: PropTypes.array,
  columnData: PropTypes.oneOfType([
    PropTypes.array,
    PropTypes.shape({
      data: PropTypes.array.isRequired,
    }),
  ]).isRequired,
  onSelectCallback: PropTypes.func,
  handleLinkButton: PropTypes.func,
  setLinkModalOpen: PropTypes.func,
  webView: PropTypes.bool,
};

TableComponent.defaultProps = {
  column: [],
  columnData: [],
  onSelectCallback: () => {},
  handleLinkButton: () => {},
  setLinkModalOpen: () => {},
  webView: false,
};

class WebTableThead extends React.Component {
  render() {
    const { column } = this.props;
    return (
      <>
        {column.map((item, index) => (
          <th
            key={`${item.title}-${index}`}
            className="px-3 py-3.5 text-left text-sm font-semibold text-black"
          >
            {item.title}
          </th>
        ))}
      </>
    );
  }
}

class WebTableBody extends React.Component {
  render() {
    const { column, item, rowIndex } = this.props;
    return (
      <>
        {column.map((column, colIndex) => (
          <td
            className="whitespace-nowrap px-3 py-4 text-sm text-gray-400"
            key={`${column.title}-${item.pool.poolID}`}
          >
            {column.render(item[column.key], rowIndex)}
          </td>
        ))}
      </>
    );
  }
}

class MobileTableThead extends React.Component {
  render() {
    return (
      <th className="px-3 py-3.5 text-left text-sm font-semibold text-black">
        Pool
      </th>
    );
  }
}

class MobileTableBody extends React.Component {
  render() {
    const { column, item, tableRowMobile, rowIndex } = this.props;
    return (
      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-400">
        <div className="grid grid-cols-2 gap-4 sm:hidden">
          {tableRowMobile.map((title, colIndex) => {
            const columnItem = column.find((col) => col.title === title);
            if (!columnItem) return null;
            const isTokens = columnItem.title === "Tokens";
            return (
              <div
                key={`${columnItem.title}-${item.pool.poolID}`}
                className={isTokens ? "col-span-2" : "col-span-1"}
              >
                {isTokens ? (
                  <>
                    <div className="text-white text-xl font-medium px-2">
                      {columnItem.render(item[columnItem.key], rowIndex)}
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-gray-400 text-sm font-medium">
                      {columnItem.title}
                    </p>
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
    );
  }
}

const MemoizedExpandTableComponent = memo(ExpandTableComponent);
const MemoizedTableComponent = memo(TableComponent);

export { MemoizedExpandTableComponent as ExpandTableComponent };
export default MemoizedTableComponent;
