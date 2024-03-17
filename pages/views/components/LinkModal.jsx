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
        onOk={() => window.open(protocolLink, "_blank")}
        onCancel={() => setLinkModalOpen(false)}
      >
        <p>
          Do you want to open "
          <a href={protocolLink} target="_blank">
            {protocolLink}
          </a>
          " ?
        </p>
      </Modal>
    </>
  );
};
export default LinkModal;
