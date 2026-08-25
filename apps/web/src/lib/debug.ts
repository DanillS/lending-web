export function debugLog(
  location: string,
  message: string,
  data: Record<string, unknown>,
  hypothesisId: string,
  runId = "post-fix",
) {
  // #region agent log
  fetch("http://127.0.0.1:7913/ingest/07fef8c1-beae-40f2-9ebd-1e2547266311", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "cbac7e" },
    body: JSON.stringify({
      sessionId: "cbac7e",
      location,
      message,
      data,
      timestamp: Date.now(),
      hypothesisId,
      runId,
    }),
  }).catch(() => {});
  // #endregion
}
