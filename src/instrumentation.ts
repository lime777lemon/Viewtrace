import type { Instrumentation } from "next";
import { registerOTel } from "@vercel/otel";

/**
 * ViewTrace 自身の OpenTelemetry。
 * - Next.js の request span と `fetch`（Browserless / Supabase / Resend / Blob）の span は自動。
 * - ViewTrace 固有の段階（capture / interaction check / save / email）は `src/lib/otel/trace.ts` の
 *   `withSpan` で足す。
 * - 送り先: Vercel 上では Vercel の OTel collector（Drains / Observability）。
 *   それ以外は `OTEL_EXPORTER_OTLP_ENDPOINT` があれば OTLP、無ければ no-op。
 */
export function register() {
  if (process.env.VIEWTRACE_OTEL_DISABLED === "1") return;
  registerOTel({ serviceName: process.env.VIEWTRACE_OTEL_SERVICE_NAME?.trim() || "viewtrace" });
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
