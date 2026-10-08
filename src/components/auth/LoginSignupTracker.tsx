"use client";

import { useEffect, useRef } from "react";
import { trackSignupConversion } from "@/lib/analytics/track";

export function LoginSignupTracker() {
  const trackedRef = useRef(false);

  useEffect(() => {
    if (trackedRef.current) return;
    trackedRef.current = true;
    trackSignupConversion();
  }, []);

  return null;
}
