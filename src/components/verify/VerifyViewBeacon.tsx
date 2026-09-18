"use client";

import { useEffect, useRef } from "react";

export function VerifyViewBeacon({ token }: { token: string }) {
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    void fetch("/api/verify-loop/view", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ token }),
      keepalive: true,
    });
  }, [token]);
  return null;
}
