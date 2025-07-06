import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MagnifyingGlassIcon } from "@heroicons/react/20/solid";
import { ethers } from "ethers";
import { ConfigProvider, notification, Menu } from "antd";
import openNotificationWithIcon from "../../utils/notification.js";

const items = [
      {
        label: (
          <a
            href="https://www.zap-pilot.org/"
            target="_blank"
          >
            Landing Page
          </a>
        ),
        key: "landing",
      },
  {
    label: <Link href="/">Vaults</Link>,
    key: "indexes",
  },
  {
    label: <Link href="/profile">Profile</Link>,
    key: "profile",
  },
  {
    label: <Link href="/dustzap">Dust Zap</Link>,
    key: "dustZap",
  }
];
export default function NavBar({ mode }) {
  const router = useRouter();
  const [current, setCurrent] = useState(router.pathname);
  const [notificationAPI, notificationContextHolder] =
    notification.useNotification();

  const onClick = (e) => {
    setCurrent(e.key);
  };
  const [address, setAddress] = useState("");

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      navigateToUrl();
    }
  };
  const navigateToUrl = () => {
    const trimmedAddress = address.trim();
    if (trimmedAddress && ethers.utils.isAddress(trimmedAddress)) {
      window.location.href = `/profile?address=${trimmedAddress}`;
      setAddress("");
    } else {
      openNotificationWithIcon(
        notificationAPI,
        "Search Result",
        "error",
        `Invalid address: ${trimmedAddress}`,
      );
    }
  };
  return (
    <ConfigProvider
      theme={{
        components: {
          Menu: {
            darkItemBg: "transparent",
            darkItemColor: "#999999",
            darkItemHoverColor: "#ffffff",
            darkSubMenuItemBg: "#222222",
          },
        },
        token: {
          colorPrimary: "transparent",
        },
      }}
    >
      {notificationContextHolder}
      <div className="md:flex items-center justify-between">
        <Menu
          theme="dark"
          onClick={onClick}
          selectable={false}
          selectedKeys={[current]}
          mode={mode}
          items={items}
          style={{ minWidth: 300, flex: "auto" }}
          role="menu"
        />
        <div className="flex flex-1 justify-center px-6" role="searchbar">
          <div className="w-full max-w-lg">
            <label htmlFor="search" className="sr-only">
              Search
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <MagnifyingGlassIcon
                  className="h-5 w-5 text-gray-400"
                  aria-hidden="true"
                />
              </div>
              <input
                id="search"
                name="search"
                className="block w-full min-w-40 rounded-md border-0 bg-gray-700 py-1.5 pl-10 pr-3 text-gray-300 placeholder:text-gray-400 focus:bg-white focus:text-gray-900 focus:ring-0 sm:text-sm sm:leading-6"
                placeholder="Search address"
                type="search"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </div>
          </div>
        </div>
      </div>
    </ConfigProvider>
  );
}
