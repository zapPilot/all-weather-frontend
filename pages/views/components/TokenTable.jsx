import { ConfigProvider, Table } from "antd";

const TokenTable = ({ columns, dataSource, pagination }) => (
  <ConfigProvider
    theme={{
      token: {
        colorBgContainer: "#000000",
        colorBorderSecondary: "#000000",
        colorFillAlter: "#5DFDCB",
        colorText: "#000000",
        colorPrimary: "#5DFDCB",
      },
    }}
  >
    <Table columns={columns} dataSource={dataSource} pagination={pagination} />
  </ConfigProvider>
    
);

export default TokenTable;