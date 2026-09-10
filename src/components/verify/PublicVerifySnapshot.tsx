"use client";

import { useEffect, useState } from "react";

type Props = {
  imageUrl: string;
  labels: {
    viewFullscreen: string;
    closeFullscreen: string;
    fullscreenHint: string;
  };
};

/**
 * 公開検証ページ（顧客共有・ログイン不要）用のスクリーンショット表示。
 * 画像をタップすると全画面になり、取得ページ全体をスクロールして確認できる。
 */
export function PublicVerifySnapshot({ imageUrl, labels }: Props) {
  const [fullscreenOpen, setFullscreenOpen] = useState(false);

  useEffect(() => {
    if (!fullscreenOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setFullscreenOpen(false);
    }
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [fullscreenOpen]);

  return (
    <>
      <button
        type="button"
        onClick={() => setFullscreenOpen(true)}
        className="group relative block w-full cursor-zoom-in"
        aria-label={labels.viewFullscreen}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- 保存済みスナップショット / 外部 CDN */}
        <img
          src={imageUrl}
          alt=""
          className="max-h-[min(60vh,520px)] w-full bg-surface object-contain object-top"
          loading="eager"
        />
        <span className="pointer-events-none absolute bottom-3 right-3 rounded-full bg-ink/75 px-3 py-1.5 text-xs font-semibold text-white shadow-sm">
          {labels.viewFullscreen}
        </span>
      </button>

      {fullscreenOpen ? (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-black/95"
          role="dialog"
          aria-modal="true"
          aria-label={labels.viewFullscreen}
        >
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <p className="truncate text-xs text-white/70">{labels.fullscreenHint}</p>
            <button
              type="button"
              onClick={() => setFullscreenOpen(false)}
              className="shrink-0 rounded-full bg-white/15 px-4 py-2 text-sm font-semibold text-white hover:bg-white/25"
            >
              {labels.closeFullscreen}
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-auto overscroll-contain px-2 pb-[env(safe-area-inset-bottom)]">
            {/* eslint-disable-next-line @next/next/no-img-element -- 保存済みスナップショット / 外部 CDN */}
            <img
              src={imageUrl}
              alt=""
              className="mx-auto block h-auto w-auto max-w-none"
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
