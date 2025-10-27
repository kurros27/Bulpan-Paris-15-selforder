"use client";

import { useEffect, useRef } from "react";

export function usePolling(callback: () => void, interval = 3000) {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (interval <= 0) return;
    const id = setInterval(() => savedCallback.current(), interval);
    return () => clearInterval(id);
  }, [interval]);
}
