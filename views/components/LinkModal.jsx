import React, { memo, useCallback } from "react";
import { Modal } from "antd";

const LinkModal = memo(function LinkModal({
  protocolLink,
  linkModalOpen,
  setLinkModalOpen,
}) {
  const handleOk = useCallback(() => {
    if (protocolLink) {
      window.open(protocolLink, "_blank", "noopener,noreferrer");
    }
  }, [protocolLink]);

  const handleCancel = useCallback(() => {
    setLinkModalOpen(false);
  }, [setLinkModalOpen]);

  return (
    <Modal
      title="Open Link"
      open={linkModalOpen}
      onOk={handleOk}
      onCancel={handleCancel}
      destroyOnClose
      maskClosable={false}
    >
      <p className="break-all">
        Do you want to open &apos;
        <a
          href={protocolLink}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 hover:text-blue-600"
        >
          {protocolLink}
        </a>
        &apos; ?
      </p>
    </Modal>
  );
});

LinkModal.displayName = "LinkModal";

export default LinkModal;
