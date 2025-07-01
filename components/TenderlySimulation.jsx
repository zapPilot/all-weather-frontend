/**
 * Tenderly Simulation Component
 * Displays simulation results with beautiful UI layout
 */

import React, { useState } from "react";
import {
  Button,
  Modal,
  Table,
  Tag,
  Alert,
  Statistic,
  Card,
  Space,
  Typography,
  Tooltip,
  Spin,
} from "antd";
import {
  PlayCircleOutlined,
  ExternalLinkOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  InfoCircleOutlined,
} from "@ant-design/icons";
import { simulateTransactionBundle } from "../utils/tenderlySimulation";
import logger from "../utils/logger";

const { Title, Text, Link } = Typography;

export default function TenderlySimulation({
  transactions = [],
  context = {},
  disabled = false,
  buttonText = "🔬 Simulate with Tenderly",
  size = "default",
}) {
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);

  const handleSimulation = async () => {
    if (!transactions.length) {
      return;
    }

    setIsSimulating(true);
    setIsModalVisible(true);

    try {
      logger.log("🔬 Starting Tenderly simulation...", {
        transactionCount: transactions.length,
        context,
      });

      const result = await simulateTransactionBundle(transactions, context);
      setSimulationResult(result);

      if (result.success) {
        logger.log("✅ Simulation completed successfully:", result.url);
      } else {
        logger.error("❌ Simulation failed:", result.error);
      }
    } catch (error) {
      logger.error("❌ Simulation error:", error);
      setSimulationResult({
        success: false,
        error: error.message,
      });
    } finally {
      setIsSimulating(false);
    }
  };

  const columns = [
    {
      title: "#",
      dataIndex: "index",
      key: "index",
      width: 50,
      render: (index) => index + 1,
    },
    {
      title: "Function",
      dataIndex: "function",
      key: "function",
      render: (func, record) => (
        <div>
          <Text code>{func}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: "12px" }}>
            {record.to?.slice(0, 6)}...{record.to?.slice(-4)}
          </Text>
        </div>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status) => (
        <Tag
          color={status === "Success" ? "success" : "error"}
          icon={
            status === "Success" ? (
              <CheckCircleOutlined />
            ) : (
              <CloseCircleOutlined />
            )
          }
        >
          {status}
        </Tag>
      ),
    },
    {
      title: "Gas Used",
      dataIndex: "gasUsed",
      key: "gasUsed",
      render: (gas) => <Text>{Number(gas || 0).toLocaleString()}</Text>,
    },
    {
      title: "Error",
      dataIndex: "error",
      key: "error",
      render: (error) =>
        error ? (
          <Tooltip title={error}>
            <Text type="danger" ellipsis style={{ maxWidth: 200 }}>
              {error}
            </Text>
          </Tooltip>
        ) : (
          "-"
        ),
    },
  ];

  const renderSimulationResults = () => {
    if (isSimulating) {
      return (
        <div style={{ textAlign: "center", padding: "40px" }}>
          <Spin size="large" />
          <div style={{ marginTop: 16 }}>
            <Title level={4}>Simulating Transactions...</Title>
            <Text type="secondary">
              Running {transactions.length} transactions through Tenderly
            </Text>
          </div>
        </div>
      );
    }

    if (!simulationResult) {
      return (
        <div style={{ textAlign: "center", padding: "40px" }}>
          <InfoCircleOutlined style={{ fontSize: 48, color: "#1890ff" }} />
          <div style={{ marginTop: 16 }}>
            <Title level={4}>Ready to Simulate</Title>
            <Text type="secondary">
              Click &quot;Simulate&quot; to test {transactions.length}{" "}
              transactions
            </Text>
          </div>
        </div>
      );
    }

    if (!simulationResult.success) {
      return (
        <Alert
          message="Simulation Failed"
          description={simulationResult.error}
          type="error"
          showIcon
          style={{ margin: "20px 0" }}
        />
      );
    }

    const { summary, transactionBreakdown, url, shareUrl } = simulationResult;

    return (
      <div>
        {/* Summary Cards */}
        <div style={{ marginBottom: 24 }}>
          <Space
            direction="horizontal"
            size="large"
            wrap
            style={{ width: "100%", justifyContent: "space-around" }}
          >
            <Card size="small" style={{ textAlign: "center", minWidth: 120 }}>
              <Statistic
                title="Total Transactions"
                value={summary.totalTransactions}
                prefix={<PlayCircleOutlined />}
              />
            </Card>
            <Card size="small" style={{ textAlign: "center", minWidth: 120 }}>
              <Statistic
                title="Successful"
                value={summary.successfulTransactions}
                valueStyle={{ color: "#3f8600" }}
                prefix={<CheckCircleOutlined />}
              />
            </Card>
            <Card size="small" style={{ textAlign: "center", minWidth: 120 }}>
              <Statistic
                title="Total Gas"
                value={Number(summary.totalGasUsed || 0).toLocaleString()}
                suffix="gas"
              />
            </Card>
            <Card size="small" style={{ textAlign: "center", minWidth: 120 }}>
              <Statistic
                title="Est. Cost"
                value={summary.estimatedCost}
                prefix="$"
                precision={4}
              />
            </Card>
          </Space>
        </div>

        {/* Tenderly Links */}
        <Alert
          message={
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Text>Simulation completed successfully!</Text>
              <Space>
                <Link href={url} target="_blank">
                  <Button
                    type="primary"
                    icon={<ExternalLinkOutlined />}
                    size="small"
                  >
                    View in Tenderly
                  </Button>
                </Link>
                <Link href={shareUrl} target="_blank">
                  <Button icon={<ExternalLinkOutlined />} size="small">
                    Share
                  </Button>
                </Link>
              </Space>
            </div>
          }
          type="success"
          style={{ marginBottom: 24 }}
        />

        {/* Transaction Breakdown Table */}
        <Title level={5}>Transaction Breakdown</Title>
        <Table
          columns={columns}
          dataSource={transactionBreakdown}
          rowKey="index"
          pagination={false}
          size="small"
          scroll={{ y: 400 }}
          style={{ marginTop: 16 }}
        />
      </div>
    );
  };

  return (
    <>
      <Button
        icon={<PlayCircleOutlined />}
        onClick={handleSimulation}
        disabled={disabled || !transactions.length}
        loading={isSimulating}
        size={size}
        type="default"
        style={{
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          border: "none",
          color: "white",
          fontWeight: "bold",
        }}
      >
        {buttonText}
      </Button>

      <Modal
        title={
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <PlayCircleOutlined style={{ color: "#1890ff" }} />
            <span>Tenderly Simulation</span>
            {context.portfolioName && (
              <Tag color="blue">{context.portfolioName}</Tag>
            )}
          </div>
        }
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setIsModalVisible(false)}>
            Close
          </Button>,
          ...(simulationResult?.success
            ? [
                <Link
                  key="tenderly"
                  href={simulationResult.url}
                  target="_blank"
                >
                  <Button type="primary" icon={<ExternalLinkOutlined />}>
                    Open in Tenderly
                  </Button>
                </Link>,
              ]
            : []),
        ]}
        width={1000}
        style={{ top: 20 }}
      >
        {renderSimulationResults()}
      </Modal>
    </>
  );
}

/**
 * Inline simulation display for smaller spaces
 */
export function TenderlySimulationInline({
  transactions,
  context,
  onSimulate,
}) {
  const [isSimulating, setIsSimulating] = useState(false);
  const [result, setResult] = useState(null);

  const handleQuickSimulation = async () => {
    setIsSimulating(true);
    try {
      const simulationResult = await simulateTransactionBundle(
        transactions,
        context,
      );
      setResult(simulationResult);
      if (onSimulate) onSimulate(simulationResult);
    } catch (error) {
      setResult({ success: false, error: error.message });
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div style={{ padding: "8px 0" }}>
      <Space direction="vertical" style={{ width: "100%" }}>
        <Button
          size="small"
          icon={<PlayCircleOutlined />}
          onClick={handleQuickSimulation}
          loading={isSimulating}
          disabled={!transactions.length}
        >
          Quick Simulate ({transactions.length} txns)
        </Button>

        {result && (
          <div>
            {result.success ? (
              <Alert
                message={
                  <div>
                    <Text>
                      ✅ Simulation: {result.summary?.successfulTransactions}/
                      {result.summary?.totalTransactions} successful
                    </Text>
                    <br />
                    <Link href={result.url} target="_blank">
                      View in Tenderly <ExternalLinkOutlined />
                    </Link>
                  </div>
                }
                type="success"
                size="small"
              />
            ) : (
              <Alert
                message={`❌ Simulation failed: ${result.error}`}
                type="error"
                size="small"
              />
            )}
          </div>
        )}
      </Space>
    </div>
  );
}
