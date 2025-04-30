import React, { memo, useMemo } from "react";
import { ConfigProvider, Table } from "antd";

const TABLE_THEME = {
  token: {
    colorBgContainer: "#000000",
    colorBorderSecondary: "#000000",
    colorFillAlter: "#5DFDCB",
    colorText: "#000000",
    colorPrimary: "#5DFDCB",
  },
};

const TokenTable = memo(function TokenTable({
  columns,
  dataSource,
  pagination = {
    pageSize: 10,
    showSizeChanger: true,
    showQuickJumper: true,
  },
  loading,
  rowKey = "id",
  scroll = { x: "max-content" },
}) {
  // Memoize the theme to prevent unnecessary re-renders
  const theme = useMemo(() => TABLE_THEME, []);

  // Memoize the table props to prevent unnecessary re-renders
  const tableProps = useMemo(
    () => ({
      columns,
      dataSource,
      pagination,
      loading,
      rowKey,
      scroll,
      size: "middle",
      bordered: true,
      className: "token-table",
      // Performance optimizations
      virtual: true,
      scrollToFirstRowOnChange: true,
      // Memory optimizations
      destroyOnClose: true,
      preserveSelectedRowKeys: false,
    }),
    [columns, dataSource, pagination, loading, rowKey, scroll],
  );

  return (
    <ConfigProvider theme={theme}>
      <Table {...tableProps} />
    </ConfigProvider>
  );
});

TokenTable.displayName = "TokenTable";

export default TokenTable;
