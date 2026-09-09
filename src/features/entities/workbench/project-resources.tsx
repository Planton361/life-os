import Link from "next/link";
import { ManagementDisclosure } from "./management-disclosure";
import type { WorkbenchData } from "@/features/real-data/supabase/repositories/entity-workbench-read";
import { ExternalResourceLink } from "@/features/resources/external-resource-link";
import { Choice, OperationForm, actionClass } from "./forms";
import { projectResourceUses } from "./project-artifacts";

const resourceTypeLabels: Record<string, string> = {
  note: "Notiz",
  learning: "Lernmaterial",
  prompt: "Prompt",
  research: "Recherche",
  link: "Link",
  source: "Quelle",
  snippet: "Snippet",
  decision: "Entscheidung",
};

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
  section: "primary" | "additional" | "references" | "reference-management";
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
  const render = (use: (typeof uses)[number], manage = false) => (
    <article
      key={use.resource.id}
      data-project-resource={use.resource.id}
      className="grid min-w-0 gap-1"
    >
      <p className="text-sm text-[var(--text-secondary)]">
        {resourceTypeLabels[use.resource.type] ?? use.resource.type}

        {use.resource.archived_at ? " · Archiviert" : ""}
      </p>
      <h3
        className={
          use === primary
            ? "break-words text-xl font-semibold"
            : "break-words font-semibold"
        }
      >
        {use.resource.title}
      </h3>
      {use === primary && use.resource.summary && (
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
      {!project.archived_at && (use.role !== "reference" || manage) && (
        <ManagementDisclosure
          label={
            use.role === "reference"
              ? "Reference verwalten"
              : "Artifact verwalten"
          }
        >
          {!use.resource.archived_at && (
            <ProjectResourceRoleForm
              projectId={projectId}
              resourceId={use.resource.id}
              role={use.role}
            />
          )}
          {use === primary && (
            <OperationForm
              operation="project.resource.role"
              label="Primary ändern"
            >
              <input type="hidden" name="projectId" value={projectId} />
              <input type="hidden" name="role" value="primary_artifact" />
              <Choice
                name="resourceId"
                label="Neues primäres Arbeitsartefakt"
                required
                options={data.resources
                  .filter((r) => !r.archived_at)
                  .map((r) => ({ id: r.id, title: r.title }))}
              />
            </OperationForm>
          )}
          <OperationForm
            operation="project.resource.role"
            label="Verknüpfung entfernen"
          >
            <input type="hidden" name="projectId" value={projectId} />
            <input type="hidden" name="resourceId" value={use.resource.id} />
            <input type="hidden" name="role" value="remove" />
          </OperationForm>
        </ManagementDisclosure>
      )}
    </article>
  );
  const titles = {
    primary: "Primary Work Artifact",
    additional: "Additional Work Artifacts",
    references: "Resources & References",
    "reference-management": "References verwalten",
  };
  return (
    <section
      aria-label={titles[section]}
      className="grid min-w-0 content-start gap-3"
    >
      <h2
        className={`text-base font-semibold ${section === "primary" ? "text-[var(--accent-cyan)]" : "text-[var(--text-muted)]"}`}
      >
        {titles[section]}
        {section === "references" || section === "additional" ? (
          <span className="text-sm font-normal text-[var(--text-muted)]">
            {" "}
            · {section === "references" ? references.length : additional.length}
          </span>
        ) : null}
      </h2>
      {section === "primary" && (
        <>
          {primary ? (
            render(primary)
          ) : (
            <p className="text-sm text-[var(--text-muted)]">
              {artifacts.length
                ? "Kein aktives primäres Arbeitsartefakt."
                : "Noch kein Arbeitsartefakt verknüpft."}
            </p>
          )}
        </>
      )}
      {section === "additional" &&
        (additional.length ? (
          <div className="grid max-h-52 gap-3 overflow-y-auto">
            {additional.map((u) => render(u))}
          </div>
        ) : (
          <p className="text-sm text-[var(--text-muted)]">
            Keine weiteren Arbeitsartefakte.
          </p>
        ))}
      {section === "additional" && !project.archived_at && (
        <ManagementDisclosure
          label="+ Artifact hinzufügen"
          initiallyOpen={Boolean(selectedResource)}
        >
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
          <Link
            className={actionClass}
            href={`/resources/new?project=${projectId}`}
          >
            Neue externe Referenz anlegen
          </Link>
        </ManagementDisclosure>
      )}
      {(section === "references" || section === "reference-management") && (
        <>
          {references.length ? (
            <div className="grid max-h-52 gap-3 overflow-y-auto">
              {references.map((u) =>
                section === "reference-management" ? (
                  render(u, true)
                ) : (
                  <article
                    key={u.resource.id}
                    data-project-resource={u.resource.id}
                    className="flex min-w-0 items-start justify-between gap-3 text-sm"
                  >
                    <div className="min-w-0">
                      <Link
                        className="break-words hover:underline"
                        href={`/resources/${u.resource.id}`}
                      >
                        {u.resource.title}
                      </Link>
                      <p className="text-sm text-[var(--text-secondary)]">
                        {resourceTypeLabels[u.resource.type] ?? u.resource.type}
                        {u.resource.archived_at ? " · Archiviert" : ""}
                      </p>
                    </div>
                    <ExternalResourceLink
                      url={u.resource.url}
                      title={u.resource.title}
                    />
                  </article>
                ),
              )}
            </div>
          ) : (
            <p className="text-sm text-[var(--text-muted)]">
              Keine References.
            </p>
          )}
          {section === "reference-management" && !project.archived_at && (
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
          )}
          {section === "references" && !project.archived_at && (
            <ManagementDisclosure label="+ Reference hinzufügen">
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
            </ManagementDisclosure>
          )}
        </>
      )}
    </section>
  );
}
