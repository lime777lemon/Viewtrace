"use client";

import { useState } from "react";

export function SavedSocialImage({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- stored og:image URL, not a next/image host
    <img
      src={src}
      alt={alt}
      className="h-36 w-full bg-surface object-cover"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  );
}
