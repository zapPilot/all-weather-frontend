import { Modal } from "antd";

const LinkModal = ({ protocolLink, linkModalOpen, setLinkModalOpen }) => {
  return (
    <>
      <Modal
        title="Open Link"
        open={linkModalOpen}
        onOk={() => window.open(protocolLink, "_blank")}
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
