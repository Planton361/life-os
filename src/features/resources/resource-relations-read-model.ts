import "server-only";

import type { ResourceRelation as RealDataResourceRelation } from "@/features/real-data";
import type {
  SupabaseClientLike,
  SupabaseQueryResult,
  TableRow,
} from "@/features/real-data/supabase";
import { createSupabaseSkillRepository } from "@/features/real-data/supabase";
import type {
  ResourceDataRelationType,
  ResourceRelationCreateTarget,
  ResourceRelationTargetType,
  ResourceRelationViewModel,
} from "./types";

type ProjectTargetRow = Pick<
  TableRow<"projects">,
  "id" | "progress" | "status" | "title" | "updated_at"
>;

type GoalTargetRow = Pick<
  TableRow<"goals">,
  "id" | "progress" | "status" | "title" | "updated_at"
>;

type TaskTargetRow = Pick<
  TableRow<"tasks">,
  "id" | "priority" | "status" | "title" | "updated_at"
>;

type ResourceTargetRow = Pick<
  TableRow<"resources">,
  "id" | "review_needed" | "source" | "title" | "type" | "updated_at"
>;

export type ResolvedResourceRelationTarget = {
  id: string;
  missing: boolean;
  progress?: number | null;
  status?: string | null;
  title: string;
  type: ResourceRelationTargetType;
};

export type ResolveResourceRelationTargetsInput = {
  client: SupabaseClientLike;
  relations: readonly RealDataResourceRelation[];
  userId: string;
};

function relationTargetKey(
  type: ResourceRelationTargetType,
  id: string,
): `${ResourceRelationTargetType}:${string}` {
  return `${type}:${id}`;
}

function unique(values: readonly string[]) {
  return Array.from(new Set(values));
}

function targetIdsByType(
  relations: readonly RealDataResourceRelation[],
  type: ResourceRelationTargetType,
) {
  return unique(
    relations
      .filter((relation) => relation.targetType === type)
      .map((relation) => relation.targetId),
  );
}

function targetUpdatedLabel(updatedAt: string) {
  return `updated ${updatedAt.slice(0, 10)}`;
}

function resourceTargetMeta(row: ResourceTargetRow) {
  return `${row.type} · ${
    row.review_needed ? "review needed" : "no review flag"
  } · ${targetUpdatedLabel(row.updated_at)}`;
}

function createTargetMap(
  rows: readonly ResolvedResourceRelationTarget[],
): ReadonlyMap<`${ResourceRelationTargetType}:${string}`, ResolvedResourceRelationTarget> {
  return new Map(rows.map((row) => [relationTargetKey(row.type, row.id), row]));
}

async function readProjectTargets(
  client: SupabaseClientLike,
  userId: string,
  ids: readonly string[],
) {
  if (ids.length === 0) return [];

  const result = (await client
    .from("projects")
    .select("id,title,status,progress,updated_at")
    .eq("user_id", userId)
    .is("archived_at", null)
    .in("id", ids)) as SupabaseQueryResult<readonly ProjectTargetRow[]>;

  if (result.error) return [];

  return (result.data ?? []).map(
    (row): ResolvedResourceRelationTarget => ({
      id: row.id,
      missing: false,
      progress: row.progress,
      status: row.status,
      title: row.title,
      type: "project",
    }),
  );
}

async function readGoalTargets(
  client: SupabaseClientLike,
  userId: string,
  ids: readonly string[],
) {
  if (ids.length === 0) return [];

  const result = (await client
    .from("goals")
    .select("id,title,status,progress,updated_at")
    .eq("user_id", userId)
    .is("archived_at", null)
    .in("id", ids)) as SupabaseQueryResult<readonly GoalTargetRow[]>;

  if (result.error) return [];

  return (result.data ?? []).map(
    (row): ResolvedResourceRelationTarget => ({
      id: row.id,
      missing: false,
      progress: row.progress,
      status: row.status,
      title: row.title,
      type: "goal",
    }),
  );
}

async function readTaskTargets(
  client: SupabaseClientLike,
  userId: string,
  ids: readonly string[],
) {
  if (ids.length === 0) return [];

  const result = (await client
    .from("tasks")
    .select("id,title,status,priority,updated_at")
    .eq("user_id", userId)
    .is("archived_at", null)
    .in("id", ids)) as SupabaseQueryResult<readonly TaskTargetRow[]>;

  if (result.error) return [];

  return (result.data ?? []).map(
    (row): ResolvedResourceRelationTarget => ({
      id: row.id,
      missing: false,
      progress: null,
      status: row.status,
      title: row.title,
      type: "task",
    }),
  );
}

async function readResourceTargets(
  client: SupabaseClientLike,
  userId: string,
  ids: readonly string[],
) {
  if (ids.length === 0) return [];

  const result = (await client
    .from("resources")
    .select("id,title,type,source,review_needed,updated_at")
    .eq("user_id", userId)
    .is("archived_at", null)
    .in("id", ids)) as SupabaseQueryResult<readonly ResourceTargetRow[]>;

  if (result.error) return [];

  return (result.data ?? []).map(
    (row): ResolvedResourceRelationTarget => ({
      id: row.id,
      missing: false,
      progress: null,
      status: row.type,
      title: row.title,
      type: "resource",
    }),
  );
}

async function readSkillTargets(
  client: SupabaseClientLike,
  userId: string,
  ids: readonly string[],
) {
  if (ids.length === 0) return [];

  const result = await createSupabaseSkillRepository(client).getActiveSkillsByUser(
    userId,
  );
  if (!result.ok) return [];

  const requestedIds = new Set(ids);
  return result.data
    .filter(
      (skill) =>
        skill.status === "active" &&
        skill.archivedAt === null &&
        requestedIds.has(skill.id),
    )
    .map(
      (skill): ResolvedResourceRelationTarget => ({
        id: skill.id,
        missing: false,
        progress: null,
        status: skill.level ?? skill.category ?? skill.status,
        title: skill.name,
        type: "skill",
      }),
    );
}

async function getSkillRelationCreateTargets(
  client: SupabaseClientLike,
  userId: string,
): Promise<ResourceRelationCreateTarget[]> {
  const result = await createSupabaseSkillRepository(client).getActiveSkillsByUser(
    userId,
  );
  if (!result.ok) return [];

  return result.data
    .filter((skill) => skill.status === "active" && skill.archivedAt === null)
    .slice(0, 50)
    .map((skill) => ({
      id: skill.id,
      meta: `${skill.level ?? skill.category ?? skill.status} · updated ${skill.updatedAt.slice(0, 10)}`,
      title: skill.name,
      type: "skill" as const,
    }));
}

export async function resolveResourceRelationTargets({
  client,
  relations,
  userId,
}: ResolveResourceRelationTargetsInput) {
  const [projects, goals, tasks, resources, skills] = await Promise.all([
    readProjectTargets(client, userId, targetIdsByType(relations, "project")),
    readGoalTargets(client, userId, targetIdsByType(relations, "goal")),
    readTaskTargets(client, userId, targetIdsByType(relations, "task")),
    readResourceTargets(client, userId, targetIdsByType(relations, "resource")),
    readSkillTargets(client, userId, targetIdsByType(relations, "skill")),
  ]);

  return createTargetMap([...projects, ...goals, ...tasks, ...resources, ...skills]);
}

export function resourceRelationToViewModel(
  relation: RealDataResourceRelation,
  targets: ReadonlyMap<
    `${ResourceRelationTargetType}:${string}`,
    ResolvedResourceRelationTarget
  >,
): ResourceRelationViewModel {
  const target = targets.get(
    relationTargetKey(relation.targetType, relation.targetId),
  );

  return {
    createdAt: relation.createdAt,
    id: relation.id,
    relationType: relation.relationType as ResourceDataRelationType,
    resourceId: relation.resourceId,
    targetId: relation.targetId,
    targetMissing: target?.missing ?? true,
    targetProgress: target?.progress,
    targetStatus: target?.status,
    targetTitle: target?.title ?? "Nicht mehr verfügbar",
    targetType: relation.targetType,
  };
}

export async function getResourceRelationCreateTargets(
  client: SupabaseClientLike,
  userId: string,
): Promise<ResourceRelationCreateTarget[]> {
  const [projectResult, goalResult, taskResult, resourceResult, skillTargets] =
    await Promise.all([
      client
        .from("projects")
        .select("id,title,status,progress,updated_at")
        .eq("user_id", userId)
        .is("archived_at", null)
        .order("updated_at", { ascending: false })
        .limit(50) as unknown as Promise<
        SupabaseQueryResult<readonly ProjectTargetRow[]>
      >,
      client
        .from("goals")
        .select("id,title,status,progress,updated_at")
        .eq("user_id", userId)
        .is("archived_at", null)
        .order("updated_at", { ascending: false })
        .limit(50) as unknown as Promise<
        SupabaseQueryResult<readonly GoalTargetRow[]>
      >,
      client
        .from("tasks")
        .select("id,title,status,priority,updated_at")
        .eq("user_id", userId)
        .is("archived_at", null)
        .order("updated_at", { ascending: false })
        .limit(50) as unknown as Promise<
        SupabaseQueryResult<readonly TaskTargetRow[]>
      >,
      client
        .from("resources")
        .select("id,title,type,source,review_needed,updated_at")
        .eq("user_id", userId)
        .is("archived_at", null)
        .order("updated_at", { ascending: false })
        .limit(50) as unknown as Promise<
        SupabaseQueryResult<readonly ResourceTargetRow[]>
      >,
      getSkillRelationCreateTargets(client, userId),
    ]);

  return [
    ...(projectResult.error
      ? []
      : (projectResult.data ?? []).map((row) => ({
          id: row.id,
          meta: `${row.status} · ${row.progress}% · ${targetUpdatedLabel(row.updated_at)}`,
          title: row.title,
          type: "project" as const,
        }))),
    ...(goalResult.error
      ? []
      : (goalResult.data ?? []).map((row) => ({
          id: row.id,
          meta: `${row.status} · ${row.progress}% · ${targetUpdatedLabel(row.updated_at)}`,
          title: row.title,
          type: "goal" as const,
        }))),
    ...(taskResult.error
      ? []
      : (taskResult.data ?? []).map((row) => ({
          id: row.id,
          meta: `${row.status} · ${row.priority} · ${targetUpdatedLabel(row.updated_at)}`,
          title: row.title,
          type: "task" as const,
        }))),
    ...(resourceResult.error
      ? []
      : (resourceResult.data ?? []).map((row) => ({
          id: row.id,
          meta: resourceTargetMeta(row),
          title: row.title,
          type: "resource" as const,
        }))),
    ...skillTargets,
  ];
}
