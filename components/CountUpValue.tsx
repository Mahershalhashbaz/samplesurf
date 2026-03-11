"use client";

import { useEffect, useState } from "react";

import { formatCents } from "@/lib/money";

type CountUpValueProps = {
  value: number;
  kind: "number" | "currencyCents";
  durationMs?: number;
};

function easeOutCubic(progress: number): number {
  return 1 - (1 - progress) ** 3;
}

function formatInteger(value: number): string {
  return value.toLocaleString("en-US");
}

export function CountUpValue({ value, kind, durationMs = 1400 }: CountUpValueProps) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") {
      setDisplayValue(value);
      return;
    }

    if (typeof navigator !== "undefined" && navigator.webdriver) {
      setDisplayValue(value);
      return;
    }

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      setDisplayValue(value);
      return;
    }

    let frameId = 0;
    let startTime = 0;

    const tick = (now: number) => {
      if (startTime === 0) {
        startTime = now;
      }

      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / durationMs);
      const nextValue = Math.round(value * easeOutCubic(progress));
      setDisplayValue(nextValue);

      if (progress < 1) {
        frameId = window.requestAnimationFrame(tick);
      }
    };

    frameId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frameId);
  }, [durationMs, value]);

  return kind === "currencyCents" ? formatCents(displayValue) : formatInteger(displayValue);
}
