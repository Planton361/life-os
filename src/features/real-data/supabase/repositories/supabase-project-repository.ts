import {
  projectGoalChangeConflictsWithDirectTasks,
  type Project,
} from "../../domain";
import type { ProjectRepository } from "../../repositories";
import type {
  RepositoryListResult,
  RepositoryResult,
} from "../../repositories/repository-result";
import { realDataTableNames } from "../database.types";
import type {
  SupabaseClientLike,
  SupabaseQueryResult,
} from "../database.types";
import {
  mapCreateProjectInputToInsert,
  mapProjectRowToDomain,
  mapUpdateProjectInputToPatch,
} from "../mappers";
import type { ProjectRow, ProjectUpdate } from "../row-types";

type RepositoryFailure = RepositoryResult<never>;

function profileScopeFailure(
  userId: string,
  profileId: string,
): RepositoryFailure | null {
  if (userId === profileId) return null;

  return {
    error: {
      code: "forbidden",
      message: "The requested profile is outside the current user scope.",
    },
    ok: false,
  };
}

function adapterFailure(operation: string): RepositoryFailure {
  return {
    error: {
      code: "adapter_unavailable",
      message: `Unable to ${operation}.`,
    },
    ok: false,
  };
}

function notFoundFailure(entity: string): RepositoryFailure {
  return {
    error: {
      code: "not_found",
      message: `${entity} was not found in the current user scope.`,
    },
    ok: false,
  };
}

function conflictFailure(message: string): RepositoryFailure {
  return {
    error: { code: "conflict", message },
    ok: false,
  };
}

type ProjectGoalRow = {
  goal_id: string | null;
  id: string;
};

type DirectTaskGoalRow = {
  goal_id: string | null;
};

async function verifyOwnedContextRow(
  client: SupabaseClientLike,
  tableName: "areas" | "goals",
  userId: string,
  id: string | null | undefined,
): Promise<boolean> {
  if (id === undefined || id === null) return true;

  const result = (await client
    .from(tableName)
    .select("id")
    .eq("user_id", userId)
    .eq("id", id)
    .is("archived_at", null)
    .maybeSingle()) as SupabaseQueryResult<{ id: string }>;

  return Boolean(!result.error && result.data);
}

async function validateProjectContextOwnership(
  client: SupabaseClientLike,
  userId: string,
  input: {
    areaId?: string | null;
    goalId?: string | null;
  },
): Promise<RepositoryFailure | null> {
  const areaOwned = await verifyOwnedContextRow(
    client,
    "areas",
    userId,
    input.areaId,
  );
  if (!areaOwned) return notFoundFailure("Area");

  const goalOwned = await verifyOwnedContextRow(
    client,
    realDataTableNames.goals,
    userId,
    input.goalId,
  );
  if (!goalOwned) return notFoundFailure("Goal");

  return null;
}

async function getActiveProjectGoal(
  client: SupabaseClientLike,
  userId: string,
  projectId: string,
): Promise<RepositoryResult<ProjectGoalRow>> {
  const result = (await client
    .from(realDataTableNames.projects)
    .select("id,goal_id")
    .eq("user_id", userId)
    .eq("id", projectId)
    .is("archived_at", null)
    .maybeSingle()) as SupabaseQueryResult<ProjectGoalRow>;

  if (result.error) return adapterFailure("load project");
  if (!result.data) return notFoundFailure("Project");

  return { data: result.data, ok: true };
}

async function validateProjectGoalAlignment(
  client: SupabaseClientLike,
  userId: string,
  projectId: string,
  nextGoalId: string | null | undefined,
): Promise<RepositoryFailure | null> {
  if (nextGoalId === undefined) return null;

  const currentProject = await getActiveProjectGoal(client, userId, projectId);
  if (!currentProject.ok) return currentProject;
  if (currentProject.data.goal_id === nextGoalId || nextGoalId === null) {
    return null;
  }

  const directTaskGoals = (await client
    .from(realDataTableNames.tasks)
    .select("goal_id")
    .eq("user_id", userId)
    .eq("project_id", projectId)
    .is("archived_at", null)
    .not("goal_id", "is", null)) as SupabaseQueryResult<
    readonly DirectTaskGoalRow[]
  >;

  if (directTaskGoals.error) {
    return adapterFailure("check project task goal alignment");
  }

  if (
    projectGoalChangeConflictsWithDirectTasks(
      nextGoalId,
      (directTaskGoals.data ?? []).map((task) => task.goal_id),
    )
  ) {
    return conflictFailure(
      "This project has tasks with direct goals that conflict with the new project goal.",
    );
  }

  return null;
}

async function updateProjectById(
  client: SupabaseClientLike,
  userId: string,
  projectId: string,
  patch: ProjectUpdate,
  operation: string,
): Promise<RepositoryResult<Project>> {
  const result = (await client
    .from(realDataTableNames.projects)
    .update(patch)
    .eq("user_id", userId)
    .eq("id", projectId)
    .is("archived_at", null)
    .select("*")
    .single()) as SupabaseQueryResult<ProjectRow>;

  if (result.error) return adapterFailure(operation);
  if (!result.data) return notFoundFailure("Project");

  return {
    data: mapProjectRowToDomain(result.data),
    ok: true,
  };
}

export function createSupabaseProjectRepository(
  client: SupabaseClientLike,
): ProjectRepository {
  return {
    async createProject(input) {
      const scopeFailure = profileScopeFailure(input.userId, input.profileId);
      if (scopeFailure) return scopeFailure;

      const contextFailure = await validateProjectContextOwnership(
        client,
        input.userId,
        input,
      );
      if (contextFailure) return contextFailure;

      const result = (await client
        .from(realDataTableNames.projects)
        .insert(mapCreateProjectInputToInsert(input, input.userId))
        .select("*")
        .single()) as SupabaseQueryResult<ProjectRow>;

      if (result.error) return adapterFailure("create project");
      if (!result.data) return notFoundFailure("Project");

      return {
        data: mapProjectRowToDomain(result.data),
        ok: true,
      };
    },

    async getProjectsByUser(userId, profileId): Promise<RepositoryListResult<Project>> {
      const scopeFailure = profileScopeFailure(userId, profileId);
      if (scopeFailure) return scopeFailure;

      const result = (await client
        .from(realDataTableNames.projects)
        .select("*")
        .eq("user_id", userId)
        .is("archived_at", null)
        .order("updated_at", { ascending: false })) as SupabaseQueryResult<
        readonly ProjectRow[]
      >;

      if (result.error) return adapterFailure("load projects");

      return {
        data: (result.data ?? []).map(mapProjectRowToDomain),
        ok: true,
      };
    },

    async updateProject(input) {
      const scopeFailure = profileScopeFailure(input.userId, input.profileId);
      if (scopeFailure) return scopeFailure;

      const contextFailure = await validateProjectContextOwnership(
        client,
        input.userId,
        input,
      );
      if (contextFailure) return contextFailure;

      const alignmentFailure = await validateProjectGoalAlignment(
        client,
        input.userId,
        input.projectId,
        input.goalId,
      );
      if (alignmentFailure) return alignmentFailure;

      return updateProjectById(
        client,
        input.userId,
        input.projectId,
        mapUpdateProjectInputToPatch(input),
        "update project",
      );
    },
  };
}
