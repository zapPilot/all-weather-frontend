import logger from "../../utils/logger";
import React, { useState, useEffect, useRef, useCallback, memo } from "react";
import { Button, message } from "antd";
import { CopyOutlined, CheckOutlined } from "@ant-design/icons";

const CopyableReferralButton = ({ referralLink }) => {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const copyToClipboard = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      message.success("Referral link copied!");

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      logger.error("Failed to copy text: ", err);
      message.error("Failed to copy referral link");
    }
  }, [referralLink]);

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

export default memo(CopyableReferralButton);
