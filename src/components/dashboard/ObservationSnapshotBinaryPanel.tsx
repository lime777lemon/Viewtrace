"use client";

import { useState } from "react";
import { verifyObservationSnapshotBinaryAction } from "@/app/actions/verify-observation-snapshot";

type Props = {
  observationId: string;
  snapshotSha256?: string;
  snapshotPhash?: string;
  snapshotBytes?: number;
  snapshotContentType?: string;
  snapshotImageUrl?: string;
};

export function ObservationSnapshotBinaryPanel({
  observationId,
  snapshotSha256,
  snapshotPhash,
  snapshotBytes,
  snapshotContentType,
  snapshotImageUrl,
}: Props) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function verify() {
    setPending(true);
    setMessage(null);
    try {
      const r = await verifyObservationSnapshotBinaryAction(observationId);
      if (!r.ok) {
        const map: Record<string, string> = {
          unauthorized: "ログインが必要です。",
          not_found: "記録が見つかりません。",
          no_hash: "バイナリハッシュがありません。",
          no_url: "検証用の画像 URL がありません。",
          fetch_failed: "画像を取得できませんでした（ブロック・期限切れなど）。検証不能です。",
          too_large: "画像が大きすぎるため検証をスキップしました。検証不能です。",
        };
        setMessage(map[r.error] ?? "検証に失敗しました。");
        return;
      }

      const distNote =
        r.phashDistance !== null ? `（知覚ハッシュ距離: ${r.phashDistance}）` : "";

      switch (r.verdict) {
        case "exact":
          setMessage(
            `完全一致: 保存時の画像データと完全に一致しています。${distNote}`.trim(),
          );
          break;
        case "visual_strong":
          setMessage(
            `視覚的一致（ほぼ同一）: 画像データは異なりますが、見た目はほぼ同一です。${distNote}`,
          );
          break;
        case "visual_weak":
          setMessage(
            `視覚的一致（かなり近い）: バイト列は異なりますが、見た目はかなり近いです。${distNote}`,
          );
          break;
        case "different":
          setMessage(
            `差分あり: 保存時の画像と差分があります。${distNote}`.trim(),
          );
          break;
        case "unverified":
          setMessage(
            "検証不能: 画像は取得できましたが、知覚ハッシュの比較ができませんでした（形式・デコード）。",
          );
          break;
        default:
          setMessage("検証結果を表示できませんでした。");
      }
    } finally {
      setPending(false);
    }
  }

  if (!snapshotSha256) {
    return (
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4 sm:col-span-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-ink-muted)]">
          スナップショット（バイナリ）
        </p>
        <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
          バイナリハッシュは Blob に保存したスナップショットのみ付与されます（外部プレビュー URL のみの記録では未設定）。
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4 sm:col-span-2">
      <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-ink-muted)]">
        スナップショット整合性チェック（SHA-256 + 知覚ハッシュ）
      </p>
      <div className="mt-1 space-y-3 text-sm text-[var(--color-ink)]">
        <p className="text-xs text-[var(--color-ink-muted)]">
          保存時: バイト列 SHA-256 は全プラン。知覚ハッシュ（blockhash）は Pro の Blob 保存・自動観測で付与。検証はボタン押下時のみ画像を 1
          回取得します。
        </p>
        {typeof snapshotBytes === "number" ? (
          <p className="text-xs text-[var(--color-ink-muted)]">
            記録時サイズ: {snapshotBytes.toLocaleString()} bytes
            {snapshotContentType ? ` · ${snapshotContentType}` : ""}
          </p>
        ) : null}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-ink-muted)]">
            SHA-256
          </p>
          <p className="break-all font-mono text-xs text-[var(--color-ink-muted)]">{snapshotSha256}</p>
        </div>
        {snapshotPhash ? (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-ink-muted)]">
              知覚ハッシュ（記録時）
            </p>
            <p className="break-all font-mono text-xs text-[var(--color-ink-muted)]">{snapshotPhash}</p>
          </div>
        ) : (
          <p className="text-xs text-[var(--color-ink-muted)]">
            知覚ハッシュ未記録（Starter の Blob 保存、または旧データ）。バイト不一致時は「差分あり」までしか判定しません。
          </p>
        )}
        {snapshotImageUrl && /^https?:\/\//i.test(snapshotImageUrl) ? (
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={pending}
              onClick={() => void verify()}
              className="inline-flex rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-xs font-semibold text-[var(--color-ink)] hover:border-[var(--color-accent)]/40 disabled:opacity-60"
            >
              {pending ? "取得中…" : "今の URL から取得して照合"}
            </button>
            <span className="text-xs text-[var(--color-ink-muted)]">（クリック時のみ 1 回取得）</span>
          </div>
        ) : null}
        {message ? <p className="text-sm text-[var(--color-ink)]">{message}</p> : null}
      </div>
    </div>
  );
}
