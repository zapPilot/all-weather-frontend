import React, { useState } from "react";
import { Menu } from "antd";
import Link from "next/link";
import { useRouter } from "next/router";

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
        label: <Link href="/betterPools">Better Pools</Link>,
        key: "setting:2",
      },
      {
        label: "Backtesting(WIP)",
        key: "setting:3",
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
    label: "Vote (WIP)",
    key: "vote",
    disabled: true,
  },
];
export default function NavBar() {
  const router = useRouter();
  const [current, setCurrent] = useState(router.pathname);
  const onClick = (e) => {
    setCurrent(e.key);
  };
  return (
    <Menu
      theme="dark"
      onClick={onClick}
      selectedKeys={[current]}
      mode="horizontal"
      items={items}
    />
  );
}
