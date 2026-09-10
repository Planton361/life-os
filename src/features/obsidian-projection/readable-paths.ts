import { createHash } from "node:crypto";

export function safeTitle(title: string) {
  let name = title
    .normalize("NFC")
    .replace(/[\p{Cc}\p{Cf}<>:"/\\|?*\[\]#^]/gu, " ")
    .replace(/\s+/g, " ")
    .replace(/^[. ]+|[. ]+$/g, "");
  name = [...name]
    .reduce((s, c) => (Buffer.byteLength(s + c) <= 160 ? s + c : s), "")
    .trim()
    .replace(/[. ]+$/g, "");
  if (!name) name = "Untitled";
  if (/^(con|prn|aux|nul|com[1-9¹²³]|lpt[1-9¹²³])(?:\.|$)/i.test(name))
    name = "_" + name;
  return name;
}
const key = (path: string) => path.normalize("NFC").toLowerCase();
export function readablePaths(
  entities: { type: string; id: string; title: string; folder: string }[],
) {
  const paths = new Map<string, string>();
  const ordered = [...entities].sort((a, b) =>
    a.id < b.id ? -1 : a.id > b.id ? 1 : a.type.localeCompare(b.type),
  );
  const reserved = new Set(
    ordered.map((e) => key(`${e.folder}/${safeTitle(e.title)}.md`)),
  );
  const used = new Set<string>();
  for (const e of ordered) {
    if (!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(e.id))
      throw new Error("Invalid entity identity.");
    const identity = `${e.type}:${e.id}`;
    if (paths.has(identity)) throw new Error("Duplicate projection identity.");
    const base = `${e.folder}/${safeTitle(e.title)}`;
    let path = base + ".md";
    if (used.has(key(path))) {
      const hash = createHash("sha256").update(e.id).digest("hex");
      let length = 8;
      do {
        if (length > hash.length)
          throw new Error("Unresolvable filename collision.");
        path = `${base}--${hash.slice(0, length++)}.md`;
      } while (used.has(key(path)) || reserved.has(key(path)));
    }
    used.add(key(path));
    paths.set(identity, path);
  }
  return paths;
}
