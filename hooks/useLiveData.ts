"use client";

import { useCallback, useEffect, useState } from "react";
import { usePolling } from "./usePolling";

interface Options<T> {
  initial?: T;
  interval?: number;
  onError?: (error: Error) => void;
}

export function useLiveData<T>(url: string, { initial, interval = 4000, onError }: Options<T> = {}) {
  const [data, setData] = useState<T | undefined>(initial);
  const [loading, setLoading] = useState(!initial);
  const [error, setError] = useState<Error | undefined>();

  const load = useCallback(async () => {
    try {
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) throw new Error(`Request failed (${response.status})`);
      const json = (await response.json()) as T;
      setData(json);
      setError(undefined);
    } catch (err) {
      const typed = err as Error;
      setError(typed);
      onError?.(typed);
    } finally {
      setLoading(false);
    }
  }, [onError, url]);

  useEffect(() => {
    load();
  }, [load]);

  usePolling(load, interval);

  return { data, loading, error, refresh: load } as const;
}
