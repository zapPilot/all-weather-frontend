import { Modal } from "antd";

const LinkModal = ({
  protocolLink,
  setProtocolLink,
  linkModalOpen,
  setLinkModalOpen,
}) => {
  setProtocolLink(protocolLink);
  return (
    <>
      <Modal
        title="Open Link"
        open={linkModalOpen}
        onOk={() => {
          if (protocolLink) window.open(protocolLink, "_blank");
        }}
        onCancel={() => setLinkModalOpen(false)}
      >
        <p>
          Do you want to open &apos;
          <a href={protocolLink} target="_blank">
            {protocolLink}
          </a>
          &apos; ?
        </p>
      </Modal>
    </>
  );
};
export default LinkModal;
