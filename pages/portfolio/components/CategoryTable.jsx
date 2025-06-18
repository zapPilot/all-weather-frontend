import { useMemo, memo } from "react";
import { Popover, Table } from "antd";
import {
  TokenDisplay,
  ProtocolInfo,
  APRDisplay,
} from "../../../components/portfolio/PortfolioComponents";
import { InfoIcon } from "../../../utils/icons.jsx";

const CategoryTable = memo(
  ({ protocolArray, portfolioName, portfolioApr, yieldContent }) => {
    const columns = useMemo(
      () => [
        {
          title: "Protocol",
          dataIndex: "protocol",
          key: "protocol",
          render: (protocol) => (
            <div className="text-white flex items-center gap-3">
              <ProtocolInfo protocol={protocol} />
            </div>
          ),
        },
        {
          title: "Tokens",
          dataIndex: "protocol",
          key: "tokens",
          render: (protocol) => (
            <div className="text-white flex items-center gap-3">
              <TokenDisplay protocol={protocol} />
            </div>
          ),
        },
        {
          title: "Weight",
          dataIndex: "protocol",
          key: "weight",
          sorter: (a, b) => a.protocol.weight - b.protocol.weight,
          render: (protocol) => (
            <span className="tabular-nums text-white">
              {(protocol.weight * 100).toFixed(0)}%
            </span>
          ),
        },
        {
          title: (
            <span>
              APR
              <Popover
                content={yieldContent}
                title="Source of Yield"
                trigger="hover"
              >
                <span style={{ display: "inline-flex" }}>
                  <InfoIcon
                    style={{
                      width: 15,
                      height: 15,
                    }}
                  />
                </span>
              </Popover>
            </span>
          ),
          dataIndex: "protocol",
          key: "apr",
          sorter: (a, b) => {
            const aprA =
              portfolioApr?.[portfolioName]?.[a.protocol.interface.uniqueId()]
                ?.apr || 0;
            const aprB =
              portfolioApr?.[portfolioName]?.[b.protocol.interface.uniqueId()]
                ?.apr || 0;
            return aprA - aprB;
          },
          render: (protocol) => (
            <span className="tabular-nums text-white" data-testid="apr">
              <APRDisplay
                apr={
                  portfolioApr?.[portfolioName]?.[
                    protocol.interface.oldUniqueId()
                  ]?.apr
                }
              />
            </span>
          ),
        },
      ],
      [portfolioName, portfolioApr, yieldContent],
    );

    const dataSource = useMemo(
      () =>
        protocolArray
          ?.filter((protocol) => protocol.weight > 0)
          ?.map((protocol, index) => ({
            key: index,
            protocol,
          }))
          .sort((a, b) => {
            if (a.protocol.weight !== b.protocol.weight) {
              return b.protocol.weight - a.protocol.weight;
            }
            const aprA =
              portfolioApr?.[portfolioName]?.[a.protocol.interface.uniqueId()]
                ?.apr || 0;
            const aprB =
              portfolioApr?.[portfolioName]?.[b.protocol.interface.uniqueId()]
                ?.apr || 0;
            return aprB - aprA;
          }),
      [protocolArray, portfolioName, portfolioApr],
    );

    return (
      <Table
        columns={columns}
        dataSource={dataSource}
        pagination={false}
        className="custom-table"
      />
    );
  },
);

CategoryTable.displayName = "CategoryTable";

export default CategoryTable;
