import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import NavBar from "./NavBar.jsx";
import { MenuOutlined, CloseOutlined } from "@ant-design/icons";
import { ConfigProvider, Drawer } from "antd";
import styles from "../../styles/Home.module.css";

export default function Header({ ...props }) {
  const [visible, setVisible] = useState(false);
  const showDrawer = () => {
    setVisible(true);
  };

  const onClose = () => {
    setVisible(false);
  };

  return (
    <div className={styles.menuBar}>
      <div className={styles.menuPC}>
        <NavBar mode={"horizontal"} />
      </div>
      <div className={styles.menuIcon}>
        <MenuOutlined onClick={showDrawer} />
      </div>
      <ConfigProvider
        theme={{
          token: {
            colorBgElevated: "#000000",
          },
        }}
      >
        <Drawer
          title={
            <Link href="/">
              <Image src="../logo.png" alt="logo" width={40} height={40} />
            </Link>
          }
          placement="right"
          closable={false}
          onClose={onClose}
          open={visible}
          extra={
            <span style={{ color: "#999999" }}>
              <CloseOutlined onClick={onClose} />
            </span>
          }
        >
          <NavBar mode={"inline"} />
        </Drawer>
      </ConfigProvider>
    </div>
  );
}
