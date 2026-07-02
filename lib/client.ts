"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export class ApiError extends Error {
  status: number;
  details?: unknown;
  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

/** Appel JSON vers l'API interne, avec erreurs typées. */
export async function api<T = unknown>(
  path: string,
  options?: RequestInit & { json?: unknown }
): Promise<T> {
  const { json: jsonBody, ...init } = options ?? {};
  const response = await fetch(path, {
    ...init,
    headers: {
      ...(jsonBody !== undefined ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
    body: jsonBody !== undefined ? JSON.stringify(jsonBody) : init.body,
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(
      (data as { error?: string })?.error ?? `Erreur ${response.status}`,
      response.status,
      (data as { details?: unknown })?.details
    );
  }
  return data as T;
}

/** Hook de chargement simple avec re-fetch manuel (mutate). */
export function useApi<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(path));
  const pathRef = useRef(path);
  pathRef.current = path;

  const load = useCallback(async () => {
    const current = pathRef.current;
    if (!current) return;
    try {
      setError(null);
      const result = await api<T>(current);
      if (pathRef.current === current) setData(result);
    } catch (e) {
      if (pathRef.current === current) setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      if (pathRef.current === current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!path) return;
    setLoading(true);
    load();
  }, [path, load]);

  return { data, error, loading, mutate: load, setData };
}

/** Joue un « ding » de nouvelle commande via WebAudio (aucun fichier binaire). */
export function playOrderChime() {
  try {
    const AudioCtx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtx();
    const play = (freq: number, start: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + start);
      gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + duration);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + duration + 0.05);
    };
    play(880, 0, 0.35);
    play(1174.66, 0.18, 0.45);
    setTimeout(() => ctx.close(), 1500);
  } catch {
    // audio non disponible : silencieux
  }
}
