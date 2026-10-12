// Reads the reason out of a failed request on the creator dashboard.
//
// Two different shapes reach the browser here: the Go API answers with
// `{response: {message}}`, this site's own Express proxy with a top-level
// `{message}` / `{error}`, so both have to be tried. Returns a bare reason, so
// the caller supplies context exactly once.
export function errorReason(data: unknown, fallback: string): string {
  const body = (data || {}) as { response?: { message?: string }; message?: string; error?: string };
  return body.response?.message || body.message || body.error || fallback;
}
