import type { WorkbenchData } from "@/features/real-data/runtime/entity-workbench-read";
import { TaskResourceComposer } from "./task-resource-composer";
import styles from "./task-read-view.module.css";

export function taskResources(data: WorkbenchData, taskId: string) {
  const linked = new Set(
    data.relations
      .filter(
        (relation) =>
          relation.target_type === "task" && relation.target_id === taskId,
      )
      .map((relation) => relation.resource_id),
  );
  return data.resources.filter(
    (resource) =>
      linked.has(resource.id) &&
      !resource.archived_at &&
      ["note", "link"].includes(resource.type),
  );
}

export function safeTaskResourceUrl(value: string | null) {
  try {
    if (!value) return null;
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) &&
      !url.username &&
      !url.password
      ? url
      : null;
  } catch {
    return null;
  }
}

export function TaskResources({
  data,
  taskId,
  writable,
}: {
  data: WorkbenchData;
  taskId: string;
  writable: boolean;
}) {
  const resources = taskResources(data, taskId);
  return (
    <>
      {(["note", "link"] as const).map((type) => {
        const entries = resources.filter((resource) => resource.type === type);
        return (
          <section
            key={type}
            aria-label={type === "note" ? "Task-Notizen" : "Externe Links"}
            className={styles.group}
          >
            <div className={styles.resourceHeading}>
              <h2>{type === "note" ? "Task-Notizen" : "Externe Links"}</h2>
              {writable && <TaskResourceComposer taskId={taskId} type={type} />}
            </div>
            {entries.length ? (
              <ul className={styles.resourceList}>
                {entries.map((resource) => {
                  const url = safeTaskResourceUrl(resource.url);
                  return (
                    <li
                      key={resource.id}
                      className={
                        type === "note"
                          ? styles.resourceNote
                          : styles.resourceLink
                      }
                    >
                      {type === "note" ? (
                        resource.summary || resource.title
                      ) : (
                        <>
                          {url ? (
                            <a
                              href={url.href}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {resource.title || url.hostname}
                              <span aria-hidden="true">↗</span>
                            </a>
                          ) : (
                            <span>{resource.title || "Link"}</span>
                          )}
                          <small>
                            {url?.hostname || "Keine sichere HTTP(S)-URL"}
                          </small>
                        </>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className={styles.resourceEmpty}>
                {type === "note"
                  ? "Noch keine Notizen. Halte kurze Infos oder Erkenntnisse fest."
                  : "Noch keine Links. Verweise auf Repositories, Websites oder Dokumente."}
              </p>
            )}
          </section>
        );
      })}
    </>
  );
}
