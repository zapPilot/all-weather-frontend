import React, { memo, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import NavBar from "./NavBar.jsx";
import { ConfigProvider, Drawer } from "antd";
import styles from "../../styles/Home.module.css";
import { MenuIcon, CloseIcon } from "../../utils/icons.jsx";
// Extract theme configuration outside component to prevent recreation
const DRAWER_THEME = {
  token: {
    colorBgElevated: "#000000",
  },
};

const Header = memo(function Header() {
  const [visible, setVisible] = React.useState(false);

  // Memoize handlers to prevent recreation on each render
  const showDrawer = useCallback(() => {
    setVisible(true);
  }, []);

  const onClose = useCallback(() => {
    setVisible(false);
  }, []);

  // Memoize drawer title to prevent recreation
  const drawerTitle = useCallback(
    () => (
      <Link href="/">
        <Image
          src="/logo.png"
          alt="logo"
          width={64}
          height={64}
          loading="lazy"
          quality={50}
          unoptimized={true}
          priority={false}
        />
      </Link>
    ),
    [],
  );

  // Memoize drawer extra content
  const drawerExtra = useCallback(
    () => (
      <span style={{ color: "#999999" }}>
        <CloseIcon onClick={onClose} />
      </span>
    ),
    [onClose],
  );

  return (
    <div className={styles.menuBar}>
      <div className={styles.menuPC}>
        <NavBar mode="horizontal" />
      </div>
      <div className={styles.menuIcon}>
        <MenuIcon onClick={showDrawer} />
      </div>
      <ConfigProvider theme={DRAWER_THEME}>
        <Drawer
          title={drawerTitle()}
          placement="right"
          closable={false}
          onClose={onClose}
          open={visible}
          extra={drawerExtra()}
          destroyOnClose={true}
          maskClosable={false}
        >
          <NavBar mode="inline" />
        </Drawer>
      </ConfigProvider>
    </div>
  );
});

Header.displayName = "Header";

export default Header;
