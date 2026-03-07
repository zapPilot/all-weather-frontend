import React, { memo, useCallback, useMemo } from "react";
import { ConfigProvider, Modal, Radio } from "antd";

const SLIPPAGE_OPTIONS = [
  { value: 0.1, label: "0.1%" },
  { value: 0.5, label: "0.5%" },
  { value: 1, label: "1%" },
];

const SlippageModal = memo(function SlippageModal({
  slippage,
  setSlippage,
  slippageModalOpen,
  setSlippageModalOpen,
}) {
  const handleCancel = useCallback(() => {
    setSlippageModalOpen(false);
  }, [setSlippageModalOpen]);

  const handleSlippageChange = useCallback(
    (e) => {
      setSlippage(e.target.value);
    },
    [setSlippage],
  );

  const theme = useMemo(
    () => ({
      token: {
        colorPrimary: "#5DFDCB",
        colorTextLightSolid: "#000000",
      },
    }),
    [],
  );

  return (
    <Modal
      title="Slippage Settings"
      centered
      open={slippageModalOpen}
      onCancel={handleCancel}
      footer={null}
      destroyOnClose
      maskClosable={false}
    >
      <p className="text-gray-600 mb-4">
        Setting a high slippage tolerance can help transactions succeed, but you
        may not get such a good price. Use with caution.
      </p>
      <ConfigProvider theme={theme}>
        <Radio.Group
          value={slippage}
          buttonStyle="solid"
          onChange={handleSlippageChange}
          className="flex gap-2"
        >
          {SLIPPAGE_OPTIONS.map(({ value, label }) => (
            <Radio.Button
              key={value}
              value={value}
              className="flex-1 text-center"
            >
              {label}
            </Radio.Button>
          ))}
        </Radio.Group>
      </ConfigProvider>
    </Modal>
  );
});

SlippageModal.displayName = "SlippageModal";

export default SlippageModal;
