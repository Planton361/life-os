import { readablePaths, safeTitle } from "./readable-paths";
import {
  projectResourceUses,
  projectRoleLabels,
} from "../entities/workbench/project-artifacts";
import { projectMilestoneGroups } from "../entities/workbench/project-milestones";
import { createHash } from "node:crypto";
import type { ProjectProjectionSource } from "../real-data/supabase/repositories/project-projection-read";
import { taskDependencyContext } from "../real-data/domain/task-dependencies";
import { createProjectionNote } from "./note-boundary";

export const projectionVersion = 1;
export type NoteType =
  | "project"
  | "milestone"
  | "task"
  | "goal"
  | "skill"
  | "resource";
const folders: Record<NoteType, string> = {
  project: "Projects",
  milestone: "Milestones",
  task: "Tasks",
  goal: "Goals",
  skill: "Skills",
  resource: "Resources",
};
export const contentHash = (content: string) =>
  createHash("sha256").update(content).digest("hex");
// Canonical prose is text, never an additional source of graph edges or embeds.
export function markdownText(value: string | null | undefined) {
  return (value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/[\\`*_[\]{}()#+.!|^~-]/g, (c) => `&#${c.codePointAt(0)};`);
}
export function wikiLink(path: string, title: string) {
  const target = path.slice(0, -3);
  return `[[${target}${target.split("/").at(-1) === title ? "" : `|${markdownText(title.replace(/[\r\n]+/g, " "))}`}]]`;
}
const sorted = <T extends { id: string }>(items: T[]) =>
  [...new Map(items.map((i) => [i.id, i])).values()].sort((a, b) =>
    a.id < b.id ? -1 : a.id > b.id ? 1 : 0,
  );
function externalReference(value: string | null) {
  if (!value) return "";
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol))
      return "Referenz mit nicht unterstütztem URL-Schema ausgelassen.";
    // A reference may contain signed URLs. Credentials, query and fragment never export.
    url.username = "";
    url.password = "";
    url.search = "";
    url.hash = "";
    return markdownText(url.toString());
  } catch {
    return "Ungültige URL ausgelassen.";
  }
}
export function projectMarkdown(
  source: ProjectProjectionSource,
  generatedAt = new Date().toISOString(),
) {
  const { project } = source;
  const tasks = sorted(source.tasks),
    milestones = sorted(source.milestones).sort(
      (a, b) => a.sort_order - b.sort_order || a.id.localeCompare(b.id),
    );
  const goals = sorted(source.goals),
    skills = sorted(source.skills),
    resources = sorted(source.resources);
  const entities = new Map<
    string,
    { type: NoteType; id: string; title: string }
  >();
  const register = (type: NoteType, id: string, title: string) =>
    entities.set(`${type}:${id}`, { type, id, title });
  register("project", project.id, project.title);
  for (const [type, rows] of [
    ["task", tasks],
    ["milestone", milestones],
    ["goal", goals],
    ["resource", resources],
  ] as const)
    for (const row of rows) register(type, row.id, row.title);
  for (const s of skills) register("skill", s.id, s.name);
  const paths = readablePaths(
    [...entities.values()].map((e) => ({ ...e, folder: folders[e.type] })),
  );
  const link = (type: string, id: string | null) => {
    const entity = entities.get(`${type}:${id}`);
    return entity
      ? wikiLink(paths.get(`${entity.type}:${entity.id}`)!, entity.title)
      : null;
  };
  const list = (values: (string | null)[]) =>
    [...new Set(values.filter((v): v is string => Boolean(v)))]
      .map((v) => `- ${v}`)
      .join("\n") || "—";
  const section = (title: string, value: string) =>
    `## ${title}\n\n${value || "—"}\n`;
  const textSection = (title: string, value: string | null | undefined) =>
    section(title, markdownText(value));
  const resourceLinks = (type: string, id: string) =>
    sorted(
      source.relations.filter(
        (r) => r.target_type === type && r.target_id === id,
      ),
    ).map((r) => link("resource", r.resource_id));
  const skillIds = (taskId: string) =>
    source.taskSkills
      .filter((l) => l.task_id === taskId)
      .map((l) => l.skill_id);
  const evidence = sorted(source.evidence).filter(
    (e) =>
      entities.has(`skill:${e.skill_id}`) &&
      entities.has(`${e.source_type}:${e.source_id}`),
  );
  const evidenceFor = (type: string, id: string) =>
    evidence
      .filter((e) =>
        type === "skill"
          ? e.skill_id === id
          : e.source_type === type && e.source_id === id,
      )
      .map(
        (e) =>
          `${markdownText(e.evidence_date)} · ${markdownText(e.title)}${e.note ? ` — ${markdownText(e.note)}` : ""}\n  ${link("skill", e.skill_id)} · ${link(e.source_type, e.source_id)}`,
      );
  const projectSkills = skills.filter(
    (s) =>
      source.taskSkills.some((l) => l.skill_id === s.id) ||
      evidence.some((e) => e.skill_id === s.id),
  );
  const graph = { tasks, dependencies: sorted(source.dependencies) };
  const files: {
    lifeOsId: string;
    lifeOsType: NoteType;
    path: string;
    content: string;
    contentHash: string;
  }[] = [];
  let noteBytes = 0;
  const add = (
    type: NoteType,
    row: {
      id: string;
      updated_at: string;
      archived_at: string | null;
      area_id?: string | null;
    },
    title: string,
    props: Record<string, string | number | null | undefined>,
    body: string,
  ) => {
    const area = source.areas.find((a) => a.id === row.area_id)?.name;
    const content = createProjectionNote(
      {
        life_os_id: row.id,
        life_os_type: type,
        life_os_projection_version: projectionVersion,
        updated_at: row.updated_at,
        archived_at: row.archived_at,
        area,
        ...props,
      },
      `# ${markdownText(title.replace(/[\r\n]+/g, " "))}\n\n${row.archived_at ? "Archiviert · historische Daten\n\n" : ""}${body}`,
    );
    noteBytes += Buffer.byteLength(content);
    if (noteBytes > 16 * 1024 * 1024)
      throw new Error("Exportpaket ist zu groß.");
    files.push({
      lifeOsId: row.id,
      lifeOsType: type,
      path: paths.get(`${type}:${row.id}`)!,
      content,
      contentHash: contentHash(content),
    });
  };
  const projectResources = projectResourceUses(
    { resources, relations: sorted(source.relations) },
    project.id,
  );
  const milestoneGroups = projectMilestoneGroups(project.id, milestones, tasks);
  const artifacts = (role: string) =>
    list(
      projectResources
        .filter((r) => r.role === role && !r.resource.archived_at)
        .map((r) => link("resource", r.resource.id)),
    );
  add(
    "project",
    project,
    project.title,
    {
      status: project.status,
      priority: project.priority,
      deadline: project.target_date,
    },
    textSection("Description", project.description) +
      textSection("Status", project.status) +
      textSection("Next Step", project.next_step) +
      section("Goal", list([link("goal", project.goal_id)])) +
      section(
        "Milestones",
        list(milestones.map((m) => link("milestone", m.id))),
      ) +
      section("Tasks", list(tasks.map((t) => link("task", t.id)))) +
      section(
        "Skills · Task / Evidence Context",
        list(projectSkills.map((s) => link("skill", s.id))),
      ) +
      section("Primary Work Artifact", artifacts("primary_artifact")) +
      section("Additional Work Artifacts", artifacts("additional_artifact")) +
      section("Resources & References", artifacts("reference")) +
      section(
        "Archived Resources / Artifacts",
        list(
          projectResources
            .filter((r) => r.resource.archived_at)
            .map((r) => link("resource", r.resource.id)),
        ),
      ),
  );
  for (const m of milestones) {
    const members = tasks.filter((t) => t.milestone_id === m.id);
    const progress = milestoneGroups.groups.find(
      (g) => g.milestone.id === m.id,
    );
    add(
      "milestone",
      m,
      m.title,
      {
        status: m.status,
        project_id: project.id,
        deadline: m.target_date,
        sort_order: m.sort_order,
      },
      section("Project", list([link("project", project.id)])) +
        textSection("Status", m.status) +
        textSection("Outcome", m.description) +
        textSection("Target", m.target_date) +
        section("Tasks", list(members.map((t) => link("task", t.id)))) +
        section(
          "Progress",
          progress
            ? `${progress.done} / ${progress.tasks.length} aktive Tasks erledigt`
            : "Archivierter Milestone · kein aktiver Fortschritt",
        ),
    );
  }
  for (const t of tasks) {
    const dep = taskDependencyContext(graph, t.id);
    add(
      "task",
      t,
      t.title,
      {
        status: t.status,
        priority: t.priority,
        project_id: project.id,
        milestone_id: t.milestone_id,
        deadline: t.due_at,
      },
      textSection("Description", t.description) +
        section("Project", list([link("project", project.id)])) +
        section("Milestone", list([link("milestone", t.milestone_id)])) +
        section("Goal", list([link("goal", t.goal_id)])) +
        section("Goal via Project", list([link("goal", project.goal_id)])) +
        section("Availability", dep.availability) +
        section(
          "Blocked by",
          list(dep.blockers.map((e) => link("task", e.task?.id ?? null))),
        ) +
        section(
          "Predecessors",
          list(dep.predecessors.map((e) => link("task", e.task?.id ?? null))),
        ) +
        section(
          "Enables",
          list(dep.successors.map((e) => link("task", e.task?.id ?? null))),
        ) +
        (dep.inconsistentCompletion
          ? section(
              "Completion",
              "Abgeschlossen trotz unerfüllter Vorgänger; historischer Zustand bleibt erhalten.",
            )
          : "") +
        section(
          "Skills",
          list(
            skillIds(t.id)
              .sort()
              .map((id) => link("skill", id)),
          ),
        ) +
        section("Resources", list(resourceLinks("task", t.id))) +
        textSection("Status", t.status),
    );
  }
  for (const g of goals)
    add(
      "goal",
      g,
      g.title,
      { status: g.status, horizon: g.horizon, deadline: g.target_date },
      textSection("Description / Outcome", g.description) +
        textSection("Why", g.why) +
        textSection("Measure", g.measure) +
        textSection("Target", g.target_value) +
        textSection("Status", g.status) +
        section(
          "Related Projects",
          list(project.goal_id === g.id ? [link("project", project.id)] : []),
        ) +
        section(
          "Direct Tasks",
          list(
            tasks
              .filter((t) => t.goal_id === g.id)
              .map((t) => link("task", t.id)),
          ),
        ) +
        section(
          "Tasks via Project",
          list(
            project.goal_id === g.id
              ? tasks.map((t) => link("task", t.id))
              : [],
          ),
        ) +
        section("Resources", list(resourceLinks("goal", g.id))) +
        section("Evidence", list(evidenceFor("goal", g.id))),
    );
  for (const s of skills)
    add(
      "skill",
      s,
      s.name,
      { status: s.status, category: s.category },
      textSection("Description", s.summary) +
        section(
          "Related Project · Task / Evidence Context",
          list([link("project", project.id)]),
        ) +
        section(
          "Tasks",
          list(
            tasks
              .filter((t) => skillIds(t.id).includes(s.id))
              .map((t) => link("task", t.id)),
          ),
        ) +
        section("Resources", list(resourceLinks("skill", s.id))) +
        section("Evidence", list(evidenceFor("skill", s.id))),
    );
  for (const r of resources)
    add(
      "resource",
      r,
      r.title,
      { resource_type: r.type },
      textSection("Type", r.type) +
        textSection("Description", r.summary) +
        textSection("Source", r.source) +
        section("External Reference", externalReference(r.url)) +
        section(
          "Related Project / Task / Goal / Skill",
          list(
            sorted(source.relations.filter((l) => l.resource_id === r.id)).map(
              (l) => {
                const target = link(l.target_type, l.target_id);
                return target
                  ? `${target} · ${l.target_type === "project" ? projectRoleLabels[l.project_role] : markdownText(l.relation_type)}${r.archived_at ? " · historisch" : ""}`
                  : null;
              },
            ),
          ),
        ) +
        section("Evidence", list(evidenceFor("resource", r.id))),
    );
  files.sort((a, b) => (a.path < b.path ? -1 : 1));
  const manifest = {
    projectionVersion,
    generatedAt,
    projectId: project.id,
    files: files.map(({ lifeOsId, lifeOsType, path, contentHash }) => ({
      lifeOsId,
      lifeOsType,
      path,
      contentHash,
    })),
  };
  return {
    files,
    manifest,
    folder: `Life-OS-Project-${safeTitle(project.title)}`,
  };
}
