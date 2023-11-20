import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { 
  Menu,
  ConfigProvider,
} from "antd";

const items = [
  {
    label: <Link href="/">Portfolio</Link>,
    key: "portfolio",
  },
  {
    label: "Analytics",
    key: "analytics",
    children: [
      {
        label: (
          <a
            href="https://debank.com/bundles/126382/portfolio"
            target="_blank"
            rel="noopener noreferrer"
          >
            Vault - DeBank
          </a>
        ),
        key: "setting:1",
      },
      {
        label: (
          <a
            href="https://dune.com/davidtnfsh/all-weather-protocol"
            target="_blank"
            rel="noopener noreferrer"
          >
            Dune Analytics
          </a>
        ),
        key: "setting:2",
      },
      {
        label: <Link href="/betterPools">Better Pools</Link>,
        key: "setting:3",
      },
      {
        label: <Link href="/installment">Installment</Link>,
        key: "installment",
      },
    ],
  },
  {
    label: (
      <a
        href="https://all-weather.gitbook.io/all-weather-protocol/"
        target="_blank"
        rel="noopener noreferrer"
      >
        Docs
      </a>
    ),
    key: "docs",
  },
  {
    label: <Link href="/cefi">Cefi</Link>,
    key: "cefi",
  },
];
export default function NavBar() {
  const router = useRouter();
  const [current, setCurrent] = useState(router.pathname);
  const onClick = (e) => {
    setCurrent(e.key);
  };
  return (
    <ConfigProvider
      theme={{
        components: {
          Menu: {
            darkItemBg: 'transparent',
            darkItemColor: '#999999',
            darkItemHoverColor: '#ffffff',
            darkSubMenuItemBg: '#001529',
          },
        },
      }}
    >
      <Menu
        theme="dark"
        onClick={onClick}
        selectedKeys={[current]}
        mode="horizontal"
        items={items}
      />
    </ConfigProvider>
    
  );
}
