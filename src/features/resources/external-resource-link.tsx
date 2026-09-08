export function externalResourceHref(value: string | null | undefined) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

export function ExternalResourceLink({
  url,
  title,
}: {
  url?: string | null;
  title: string;
}) {
  const href = externalResourceHref(url);
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${title}: Extern öffnen (neuer Tab)`}
      className="inline-flex min-h-10 items-center text-sm text-[var(--accent-cyan)] underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)]"
    >
      Extern öffnen ↗
    </a>
  );
}
