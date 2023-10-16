import { useEffect, useState } from "react";

const useWindowWidth = () => {
  const [windowWidth, setWindowWidth] = useState(0); // 視窗高度狀態

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth); // 調整視窗高度並減去 Header 的高度（64）
    };

    window.addEventListener("resize", handleResize); // 監聽視窗大小改變事件

    handleResize(); // 初始化視窗高度

    return () => {
      window.removeEventListener("resize", handleResize); // 移除事件監聽器
    };
  }, []);

  return windowWidth;
};

const useWindowHeight = () => {
  const [windowHeight, setWindowHeight] = useState(0); // 視窗高度狀態

  useEffect(() => {
    const handleResize = () => {
      setWindowHeight(window.innerHeight - 170); // 調整視窗高度並減去 Header 的高度（64）
    };

    window.addEventListener("resize", handleResize); // 監聽視窗大小改變事件

    handleResize(); // 初始化視窗高度

    return () => {
      window.removeEventListener("resize", handleResize); // 移除事件監聽器
    };
  }, []);

  return windowHeight;
};

export { useWindowWidth, useWindowHeight };
