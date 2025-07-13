import React, { memo, useCallback } from "react";
import { Modal, Button } from "antd";
import { ShareIcon, SparklesIcon } from "@heroicons/react/24/outline";

const SocialShareModal = memo(function SocialShareModal({
  visible,
  onClose,
  conversionData,
}) {
  const { totalValue, tokenCount, transactionHash, explorerUrl } =
    conversionData || {};

  const formatValue = (value) => {
    if (!value) return "0.00";
    return value.toFixed(2);
  };
  const url = "https://app.zap-pilot.org/dustzap/?mode=eoa";
  const twitterMessage = `Just cleaned up my wallet with @zapPilot ! 🧹✨

Converted ${tokenCount} dust tokens worth $${formatValue(
    totalValue,
  )} to ETH in one transaction. 

Clean wallet = better portfolio management! 

Try it: ${url}

#DeFi #DustConversion #ZapPilot`;

  const farcasterMessage = `Cleaned up my wallet with Zap Pilot! 🧹

Converted ${tokenCount} dust tokens worth $${formatValue(
    totalValue,
  )} to ETH. Such a satisfying feeling when your wallet is organized! ✨

Try dust cleanup: ${url}`;

  const handleTwitterShare = useCallback(() => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
      twitterMessage,
    )}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }, [twitterMessage]);

  const handleFarcasterShare = useCallback(() => {
    const url = `https://warpcast.com/~/compose?text=${encodeURIComponent(
      farcasterMessage,
    )}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }, [farcasterMessage]);

  const handleViewTransaction = useCallback(() => {
    if (explorerUrl && transactionHash) {
      window.open(
        `${explorerUrl}/tx/${transactionHash}`,
        "_blank",
        "noopener,noreferrer",
      );
    }
  }, [explorerUrl, transactionHash]);

  return (
    <Modal
      title={null}
      open={visible}
      onCancel={onClose}
      footer={null}
      className="social-share-modal"
      width={500}
      destroyOnClose
      maskClosable={true}
    >
      <div className="text-center py-6">
        {/* Success Icon */}
        <div className="mx-auto mb-6 w-16 h-16 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center">
          <SparklesIcon className="w-8 h-8 text-white" />
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Conversion Complete! 🎉
        </h2>

        {/* Conversion Summary */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 mb-6">
          <div className="text-lg font-semibold text-gray-800 mb-1">
            Successfully converted {tokenCount} tokens
          </div>
          <div className="text-3xl font-bold text-blue-600">
            ${formatValue(totalValue)}
          </div>
          <div className="text-sm text-gray-600">
            Total dust value converted to ETH
          </div>
        </div>

        {/* Share Message */}
        <p className="text-gray-600 mb-6">
          Share your success and help others discover the power of wallet
          optimization!
        </p>

        {/* Social Share Buttons */}
        <div className="space-y-3 mb-6">
          <Button
            type="primary"
            size="large"
            onClick={handleTwitterShare}
            className="w-full h-12 bg-blue-500 hover:bg-blue-600 border-0 rounded-lg font-semibold"
            icon={
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            }
          >
            Share on Twitter/X
          </Button>

          <Button
            size="large"
            onClick={handleFarcasterShare}
            className="w-full h-12 border-2 border-purple-500 text-purple-600 hover:bg-purple-50 rounded-lg font-semibold"
            icon={
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
                <path d="M8 8h2v8H8zm6 0h2v8h-2z" />
              </svg>
            }
          >
            Share on Farcaster
          </Button>
        </div>

        {/* Transaction Link */}
        {explorerUrl && transactionHash && (
          <div className="mb-4">
            <Button
              type="link"
              onClick={handleViewTransaction}
              className="text-blue-600 hover:text-blue-700"
              icon={<ShareIcon className="w-4 h-4" />}
            >
              View Transaction on Explorer
            </Button>
          </div>
        )}

        {/* Close Button */}
        <Button
          size="large"
          onClick={onClose}
          className="w-full h-12 border-gray-300 text-gray-600 hover:text-gray-700 hover:border-gray-400 rounded-lg"
        >
          Close
        </Button>
      </div>
    </Modal>
  );
});

SocialShareModal.displayName = "SocialShareModal";

export default SocialShareModal;
