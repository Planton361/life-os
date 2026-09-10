export function containsExportCredential(content: string) {
  const text = content.replace(/&#(\d+);/g, (_, n) =>
    String.fromCodePoint(Number(n)),
  );
  return /(?:eyJ[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+|(?:sb_secret_|sk-[A-Za-z0-9])[A-Za-z0-9_-]{12,}|(?:service[_ -]?role|api[_ -]?(?:key|token)|password|db_password)\s*[:=]\s*\S+)/i.test(
    text,
  );
}
export function sameOriginExportRequest(request: Request) {
  try {
    const origin = new URL(request.headers.get("origin") ?? "");
    // Next's internal request URL may use localhost while the browser uses 127.0.0.1.
    // Host is the actual HTTP authority; browsers cannot forge it via fetch headers.
    return (
      origin.host === request.headers.get("host") &&
      origin.protocol === new URL(request.url).protocol
    );
  } catch {
    return false;
  }
}
