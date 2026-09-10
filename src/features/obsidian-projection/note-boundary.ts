export const generatedStart = "<!-- LIFE_OS_GENERATED_START -->";
export const generatedEnd = "<!-- LIFE_OS_GENERATED_END -->";
export const userStart = "<!-- LIFE_OS_USER_START -->";
export const userEnd = "<!-- LIFE_OS_USER_END -->";
const propertyStart = "# LIFE_OS_PROPERTIES_START";
const propertyEnd = "# LIFE_OS_PROPERTIES_END";
const markers = [
  propertyStart,
  propertyEnd,
  generatedStart,
  generatedEnd,
  userStart,
  userEnd,
];
function sections(note: string) {
  for (const marker of markers)
    if (note.split(marker).length !== 2)
      throw new Error(
        "Ambiguous projection boundaries; preserve the existing file.",
      );
  const positions = markers.map((m) => note.indexOf(m));
  if (
    !note.startsWith("---\n" + propertyStart + "\n") ||
    positions.some((p, i) => i > 0 && p <= positions[i - 1])
  )
    throw new Error(
      "Invalid projection boundaries; preserve the existing file.",
    );
  if (
    note.slice(positions[1] + propertyEnd.length, positions[2]) !== "\n---\n\n"
  )
    throw new Error("Unowned properties; preserve the existing file.");
  return positions;
}
export function createProjectionNote(
  properties: Record<string, string | number | null | undefined>,
  body: string,
) {
  const yaml = Object.entries(properties)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
    .join("\n");
  return `---\n${propertyStart}\n${yaml}\n${propertyEnd}\n---\n\n${generatedStart}\n${body}\n${generatedEnd}\n\n${userStart}\n\n## Meine Notizen\n\n${userEnd}\n`;
}
// Pure future update primitive, not a filesystem writer/importer. Preserve every byte
// outside owned Properties and Generated body; reject ambiguous/unmarked documents.
export function replaceGeneratedState(existing: string, replacement: string) {
  const old = sections(existing),
    next = sections(replacement);
  const identity = (s: string) => s.match(/^life_os_id: (.+)$/m)?.[1];
  const type = (s: string) => s.match(/^life_os_type: (.+)$/m)?.[1];
  if (
    !identity(existing) ||
    identity(existing) !== identity(replacement) ||
    type(existing) !== type(replacement)
  )
    throw new Error("Projection identity mismatch.");
  return (
    replacement.slice(0, next[1] + propertyEnd.length) +
    existing.slice(old[1] + propertyEnd.length, old[2]) +
    replacement.slice(next[2], next[3] + generatedEnd.length) +
    existing.slice(old[3] + generatedEnd.length)
  );
}
