import Link from "next/link";
import type {
  SemanticConnectedContext,
  SemanticRelationEntry,
} from "./read-model";

const groups = [
  ["tasks", "Tasks"],
  ["projects", "Projects"],
  ["goals", "Goals"],
  ["resources", "Resources"],
] as const;

function RelationEntry({ entry }: Readonly<{ entry: SemanticRelationEntry }>) {
  const pathLabel = entry.direct
    ? "Direkt"
    : `Via ${entry.via?.type ?? "Kontext"}: ${entry.via?.title ?? "kanonische Relation"}`;

  return (
    <li className="rounded-[10px] border border-[var(--border-subtle)] bg-[rgba(11,17,28,.40)] px-3 py-2" data-connected-context-entry={`${entry.targetType}:${entry.targetId}`}>
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[11px] font-semibold text-[var(--text-primary)]">{entry.targetTitle}</p>
          <p className="mt-1 text-[10px] leading-4 text-[var(--text-muted)]">
            {entry.targetType} · {entry.relationType} · {pathLabel}
          </p>
          <p className="text-[9px] leading-4 text-[var(--text-faint)]">
            {entry.direction} · {entry.source}{entry.archived ? " · Archiviert" : ""}
          </p>
        </div>
        <Link className="shrink-0 text-[10px] font-semibold text-[var(--accent-cyan)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]" href={entry.href}>
          Öffnen
        </Link>
      </div>
    </li>
  );
}

export function ConnectedContext({ context }: Readonly<{ context: SemanticConnectedContext }>) {
  return (
    <section aria-labelledby="connected-context-heading" data-connected-context>
      <h3 className="text-[13px] font-semibold text-[var(--text-primary)]" id="connected-context-heading">Connected Context</h3>
      <p className="mt-1 text-[10px] leading-4 text-[var(--text-muted)]">Kanonische, user-scoped Beziehungen ohne abgeleitete Namens- oder Texttreffer.</p>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {groups.map(([key, title]) => {
          const entries = context[key];
          return (
            <section aria-label={`Connected Context ${title}`} className="min-w-0" key={key}>
              <h4 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">{title}</h4>
              {entries.length > 0 ? (
                <ul className="mt-1 grid gap-1.5">{entries.map((entry) => <RelationEntry entry={entry} key={`${entry.targetType}:${entry.targetId}`} />)}</ul>
              ) : (
                <p className="mt-1 rounded-[10px] border border-dashed border-[var(--border-subtle)] px-3 py-2 text-[10px] text-[var(--text-muted)]">Keine kanonische Relation.</p>
              )}
            </section>
          );
        })}
      </div>
    </section>
  );
}
