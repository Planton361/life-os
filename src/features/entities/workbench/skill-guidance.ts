import {
  taskDependencyContext,
  type TaskDependencyGraph,
} from "../../real-data/domain/task-dependencies";
import {
  skillPracticeReads,
  type SkillDevelopmentRead,
} from "../../real-data/domain/skill-development";

export function skillTaskReadiness(
  graph: TaskDependencyGraph,
  id: string,
  unavailable = false,
) {
  if (unavailable || !graph.tasks.some((t) => t.id === id))
    return {
      label: "Ausführbarkeit derzeit nicht verfügbar",
      availability: "UNAVAILABLE",
      blockers: [],
    };
  const context = taskDependencyContext(graph, id);
  return {
    ...context,
    label: context.availability === "READY" ? "Ausführbar" : "Blockiert",
  };
}

export function skillWorkAction(
  read: SkillDevelopmentRead,
  graph: TaskDependencyGraph,
  unavailable = false,
  hasMaterial = false,
) {
  const reads = skillPracticeReads(
    read.practice,
    read.evidence,
    read.as_of,
    read.timezone,
  );
  const empty =
    !hasMaterial &&
    !read.targets.length &&
    !read.milestones.length &&
    !read.practice.length &&
    !read.evidence.length &&
    !read.reviews.length;
  const result = (kind: string, label: string, taskId?: string) => ({
    kind,
    label,
    taskId,
    empty,
  });
  if (read.skill.archived_at || read.skill.status === "archived")
    return result("restore", "Skill wiederherstellen");
  if (read.skill.status === "paused")
    return result("resume", "Entwicklung fortsetzen");
  if (reads.open.length) {
    const readiness = reads.open.map((t) =>
      skillTaskReadiness(graph, t.id, unavailable),
    );
    if (readiness.some((r) => r.availability === "UNAVAILABLE"))
      return result("unavailable", "Aufgaben ansehen");
    if (readiness.every((r) => r.availability === "BLOCKED"))
      return result("blocked", "Blocker ansehen");
    if (reads.open.length > 1) return result("choose", "Aufgabe auswählen");
    return result("open", "Aufgabe öffnen", reads.open[0].id);
  }
  if (empty) return result("focus", "Entwicklungsfokus festlegen");
  if (
    !read.targets.some((t) => !t.archived_at && t.status === "current") &&
    read.targets.some((t) => !t.archived_at && t.status === "planned") &&
    !read.practice.length &&
    !read.evidence.length
  )
    return result("planned", "Fokus wählen");
  return result("create", "Übungsaufgabe anlegen");
}
