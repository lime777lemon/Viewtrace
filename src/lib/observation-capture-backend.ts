/**
 * Production default is Browserless.
 * Playwright worker is off unless both the backend flag and worker URL/secret are set.
 */
export function isPlaywrightWorkerCaptureEnabled(): boolean {
  const backend = process.env.VIEWTRACE_CAPTURE_BACKEND?.trim().toLowerCase();
  if (backend !== "playwright_worker") return false;
  return Boolean(
    process.env.VIEWTRACE_OBSERVATION_WORKER_URL?.trim() &&
      process.env.VIEWTRACE_OBSERVATION_WORKER_SECRET?.trim(),
  );
}
