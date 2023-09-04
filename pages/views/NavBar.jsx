import React, { useState } from "react";
import {
  AppstoreOutlined,
  MailOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import { Menu } from "antd";
const items = [
  {
    label: "Portfolio",
    key: "portfolio",
  },
  {
    label: "Analytics",
    key: "analytics",
    children: [
      {
        type: "group",
        label: "Recommendations",
        children: [
          {
            label: "Better Pools",
            key: "setting:1",
          },
        ],
      },
      {
        type: "group",
        label: "Performance",
        children: [
          {
            label: "Backtesting",
            key: "setting:2",
          },
        ],
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
const NavBar = () => {
  const [current, setCurrent] = useState("portfolio");
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
};
export default NavBar;
