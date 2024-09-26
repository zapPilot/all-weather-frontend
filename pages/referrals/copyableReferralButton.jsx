import React, { useState } from "react";
import { Button, message } from "antd";
import { CopyOutlined, CheckOutlined } from "@ant-design/icons";

const CopyableReferralButton = ({ referralLink }) => {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      message.success("Referral link copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
      message.error("Failed to copy referral link");
    }
  };

  return (
    <Button
      onClick={copyToClipboard}
      type={copied ? "primary" : "default"}
      icon={copied ? <CheckOutlined /> : <CopyOutlined />}
      className={`flex items-center justify-center font-medium transition-colors ${
        copied
          ? "bg-green-500 hover:bg-green-600 border-green-500"
          : "hover:bg-blue-50"
      }`}
    >
      {copied ? "Copied!" : "Copy Referral Link"}
    </Button>
  );
};

export default CopyableReferralButton;
