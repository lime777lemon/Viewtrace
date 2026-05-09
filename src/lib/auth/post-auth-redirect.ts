/** 相対パス next を絶対 URL にする（遷移先の解決を明示する） */
export function absoluteUrlForNextPath(nextPath: string): string {
  if (typeof window === "undefined") return nextPath;
  try {
    return new URL(nextPath, window.location.origin).href;
  } catch {
    return `${window.location.origin}${nextPath.startsWith("/") ? "" : "/"}${nextPath}`;
  }
}

const AFTER_EXCHANGE_WAIT_MS = 2_500;

/**
 * セッション Cookie の反映とサーバー側の after-exchange をある程度待ってから遷移する。
 * 待ちすぎないよう上限付き。
 */
export async function postAuthSideEffectsBeforeNavigate(): Promise<void> {
  await Promise.race([
    fetch("/api/auth/after-exchange", {
      method: "POST",
      credentials: "include",
      keepalive: true,
    })
      .then((r) => {
        if (!r.ok) console.warn("[auth] after-exchange failed", r.status);
      })
      .catch((e) => console.warn("[auth] after-exchange error", e)),
    new Promise<void>((r) => setTimeout(r, AFTER_EXCHANGE_WAIT_MS)),
  ]);
}
