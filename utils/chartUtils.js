import { useEffect, useState, useRef, useCallback } from "react";

const useWindowWidth = () => {
  const [windowWidth, setWindowWidth] = useState(0);
  const timeoutRef = useRef(null);

  const debouncedHandleResize = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setWindowWidth(window.innerWidth);
    }, 150); // 150ms debounce delay
  }, []);

  useEffect(() => {
    // Set initial value
    setWindowWidth(window.innerWidth);

    window.addEventListener("resize", debouncedHandleResize);

    return () => {
      window.removeEventListener("resize", debouncedHandleResize);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [debouncedHandleResize]);

  return windowWidth;
};

const useWindowHeight = () => {
  const [windowHeight, setWindowHeight] = useState(0);
  const timeoutRef = useRef(null);

  const debouncedHandleResize = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setWindowHeight(window.innerHeight - 170);
    }, 150); // 150ms debounce delay
  }, []);

  useEffect(() => {
    // Set initial value
    setWindowHeight(window.innerHeight - 170);

    window.addEventListener("resize", debouncedHandleResize);

    return () => {
      window.removeEventListener("resize", debouncedHandleResize);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [debouncedHandleResize]);

  return windowHeight;
};

export { useWindowWidth, useWindowHeight };
