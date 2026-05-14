import type { Instrumentation } from "next";

export function register() {
  // No-op: ops hooks live in onRequestError.
}

export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.OPS_MONITORING_DISABLED === "1") return;

  const error = err instanceof Error ? err : new Error(String(err));
  const digest =
    "digest" in error && typeof (error as { digest?: unknown }).digest === "string"
      ? (error as { digest: string }).digest
      : "";

  try {
    const { insertOpsSignal } = await import("@/lib/ops/insert-signal");
    await insertOpsSignal("server_error", {
      message: error.message?.slice(0, 2000) ?? "",
      digest,
      path: request.path,
      method: request.method,
      routePath: context.routePath,
      routeType: context.routeType,
      routerKind: context.routerKind,
    });
  } catch {
    // Never throw from instrumentation.
  }
};
