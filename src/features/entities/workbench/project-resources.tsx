import Link from "next/link";
import type { WorkbenchData } from "@/features/real-data/supabase/repositories/entity-workbench-read";
import { ExternalResourceLink } from "@/features/resources/external-resource-link";
import { Choice, OperationForm, actionClass } from "./forms";
import { projectResourceUses, projectRoleLabels } from "./project-artifacts";

export function ProjectResourceRoleForm({
  projectId,
  resourceId,
  role,
  label = "Verwendung speichern",
}: {
  projectId: string;
  resourceId: string;
  role?: string;
  label?: string;
}) {
  return (
    <OperationForm operation="project.resource.role" label={label}>
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="resourceId" value={resourceId} />
      <Choice
        name="role"
        label="Verwendung im Project"
        value={role}
        required
        options={[
          {
            id: "primary_artifact",
            title: "Als primäres Arbeitsartefakt verwenden",
          },
          { id: "additional_artifact", title: "Weiteres Arbeitsartefakt" },
          { id: "reference", title: "Resource / Reference" },
        ]}
      />
    </OperationForm>
  );
}

export function ProjectResources({
  data,
  projectId,
  section,
  selectedResource,
}: {
  data: WorkbenchData;
  projectId: string;
  section: "artifacts" | "references";
  selectedResource?: string;
}) {
  const project = data.projects.find((p) => p.id === projectId)!;
  const uses = projectResourceUses(data, projectId);
  const artifacts = uses.filter((u) => u.role !== "reference");
  const primary = artifacts.find(
    (u) => u.role === "primary_artifact" && !u.resource.archived_at,
  );
  const additional = artifacts.filter((u) => u !== primary);
  const references = uses.filter((u) => u.role === "reference");
  const render = (use: (typeof uses)[number]) => (
    <article
      key={use.resource.id}
      data-project-resource={use.resource.id}
      className="grid min-w-0 content-start gap-3 rounded-lg border border-[var(--border-subtle)] p-4"
    >
      <p className="text-sm text-[var(--text-muted)]">
        {use.resource.type} · {projectRoleLabels[use.role]}
        {use.resource.archived_at ? " · Archiviert" : ""}
      </p>
      <h3 className="break-words font-semibold">{use.resource.title}</h3>
      {use.resource.summary && (
        <p className="line-clamp-3 break-words text-sm text-[var(--text-secondary)]">
          {use.resource.summary}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-4">
        <ExternalResourceLink
          url={use.resource.url}
          title={use.resource.title}
        />
        <Link
          className="min-h-10 content-center text-sm underline"
          href={`/resources/${use.resource.id}`}
        >
          Details öffnen
        </Link>
      </div>
      {!project.archived_at && (
        <>
          {!use.resource.archived_at && (
            <details>
              <summary className="cursor-pointer text-sm">
                Verwendung ändern
              </summary>
              <ProjectResourceRoleForm
                projectId={projectId}
                resourceId={use.resource.id}
                role={use.role}
              />
            </details>
          )}
          <OperationForm
            operation="project.resource.role"
            label="Verknüpfung entfernen"
          >
            <input type="hidden" name="projectId" value={projectId} />
            <input type="hidden" name="resourceId" value={use.resource.id} />
            <input type="hidden" name="role" value="remove" />
          </OperationForm>
        </>
      )}
    </article>
  );
  return (
    <section
      aria-label={
        section === "artifacts" ? "Work Artifacts" : "Resources & References"
      }
      className="grid min-w-0 content-start gap-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-1)] p-5"
    >
      <h2 className="text-lg font-semibold">
        {section === "artifacts" ? "Work Artifacts" : "Resources & References"}
      </h2>
      {section === "artifacts" ? (
        <>
          <div className="grid items-start gap-4 xl:grid-cols-2">
            <section
              aria-label="Primary Work Artifact"
              className="grid min-w-0 gap-3"
            >
              <h3 className="text-sm font-semibold text-[var(--accent-cyan)]">
                Primary Work Artifact
              </h3>
              {primary ? (
                render(primary)
              ) : (
                <p className="text-sm text-[var(--text-muted)]">
                  {artifacts.length
                    ? "Kein aktives primäres Arbeitsartefakt."
                    : "Noch kein Arbeitsartefakt verknüpft."}
                </p>
              )}
            </section>
            {additional.length > 0 && (
              <section
                aria-label="Additional Work Artifacts"
                className="grid min-w-0 gap-3"
              >
                <h3 className="text-sm font-semibold">
                  Weitere Arbeitsartefakte / Historie
                </h3>
                {additional.map(render)}
              </section>
            )}
          </div>
          {!project.archived_at && (
            <div className="grid gap-3">
              <details open={Boolean(selectedResource)}>
                <summary className="cursor-pointer text-sm">
                  Bestehendes verknüpfen
                </summary>
                <OperationForm
                  operation="project.resource.role"
                  label="Mit Project verknüpfen"
                >
                  <input type="hidden" name="projectId" value={projectId} />
                  <Choice
                    name="resourceId"
                    label="Resource"
                    value={selectedResource}
                    required
                    options={data.resources
                      .filter((r) => !r.archived_at)
                      .map((r) => ({ id: r.id, title: r.title }))}
                  />
                  <Choice
                    name="role"
                    label="Verwendung im Project"
                    required
                    options={[
                      {
                        id: "primary_artifact",
                        title: "Als primäres Arbeitsartefakt verwenden",
                      },
                      {
                        id: "additional_artifact",
                        title: "Weiteres Arbeitsartefakt",
                      },
                      { id: "reference", title: "Resource / Reference" },
                    ]}
                  />
                </OperationForm>
              </details>
              <Link
                className={`${actionClass} justify-self-start`}
                href={`/resources/new?project=${projectId}`}
              >
                Neue externe Referenz anlegen
              </Link>
            </div>
          )}
        </>
      ) : (
        <>
          {references.length ? (
            references.map(render)
          ) : (
            <p className="text-sm text-[var(--text-muted)]">
              Noch keine unterstützenden References.
            </p>
          )}
          {!project.archived_at && (
            <details>
              <summary className="cursor-pointer text-sm">
                Reference verknüpfen
              </summary>
              <OperationForm
                operation="project.resource.role"
                label="Reference verknüpfen"
              >
                <input type="hidden" name="projectId" value={projectId} />
                <input type="hidden" name="role" value="reference" />
                <Choice
                  name="resourceId"
                  label="Resource"
                  required
                  options={data.resources
                    .filter((r) => !r.archived_at)
                    .map((r) => ({ id: r.id, title: r.title }))}
                />
              </OperationForm>
            </details>
          )}
        </>
      )}
    </section>
  );
}
