import { contentHash, type projectMarkdown } from "./project-markdown";
import { replaceGeneratedState } from "./note-boundary";
type Projection = ReturnType<typeof projectMarkdown>;
// Pure mapping/update model only: no Vault access, filesystem rename, importer or sync.
// Removed identities are retained separately for a future non-destructive policy.
export function updateProjection(
  previous: Projection & { retainedFiles?: Projection["files"] },
  next: Projection,
) {
  if (previous.manifest.projectId !== next.manifest.projectId)
    throw new Error("Project mismatch.");
  const identity = (f: Projection["files"][number]) =>
    `${f.lifeOsType}:${f.lifeOsId}`;
  const previousFiles = [...previous.files, ...(previous.retainedFiles ?? [])];
  const old = new Map(previousFiles.map((f) => [identity(f), f]));
  if (old.size !== previousFiles.length)
    throw new Error("Duplicate previous identity.");
  const seen = new Set<string>();
  const changes: {
    lifeOsId: string;
    lifeOsType: string;
    operation: "RENAME" | "UPDATE" | "CREATE";
    oldPath: string | null;
    newPath: string;
  }[] = [];
  const files = next.files.map((f) => {
    const id = identity(f);
    if (seen.has(id)) throw new Error("Duplicate next identity.");
    seen.add(id);
    const prior = old.get(id);
    const content = prior
      ? replaceGeneratedState(prior.content, f.content)
      : f.content;
    changes.push({
      lifeOsId: f.lifeOsId,
      lifeOsType: f.lifeOsType,
      operation: !prior
        ? "CREATE"
        : prior.path === f.path
          ? "UPDATE"
          : "RENAME",
      oldPath: prior?.path ?? null,
      newPath: f.path,
    });
    return { ...f, content, contentHash: contentHash(content) };
  });
  const retainedFiles = previousFiles.filter((f) => !seen.has(identity(f)));
  const paths = [...files, ...retainedFiles].map((f) =>
    f.path.normalize("NFC").toLowerCase(),
  );
  if (new Set(paths).size !== paths.length)
    throw new Error("Retained file collision; preserve existing files.");
  return {
    ...next,
    files,
    retainedFiles,
    manifest: {
      ...next.manifest,
      files: files.map(({ lifeOsId, lifeOsType, path, contentHash }) => ({
        lifeOsId,
        lifeOsType,
        path,
        contentHash,
      })),
      changes,
    },
  };
}
