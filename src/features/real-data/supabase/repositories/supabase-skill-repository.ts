import type { Skill, SkillEvidence, TaskSkillLink } from "../../domain";
import type { SkillRepository } from "../../repositories";
import type {
  RepositoryListResult,
  RepositoryResult,
} from "../../repositories/repository-result";
import {
  mapSkillEvidenceRowToDomain,
  mapSkillRowToDomain,
  mapTaskSkillLinkRowToDomain,
  mapTaskSkillLinkToInsert,
} from "../mappers";
import { realDataTableNames } from "../database.types";
import type {
  SupabaseClientLike,
  SupabaseQueryResult,
} from "../database.types";
import type {
  SkillEvidenceRow,
  SkillRow,
  TaskSkillLinkRow,
} from "../row-types";

type RepositoryFailure = RepositoryResult<never>;

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

function validationFailure(message: string): RepositoryFailure {
  return {
    error: {
      code: "validation_error",
      message,
    },
    ok: false,
  };
}

function mapSkillRows(rows: readonly SkillRow[]): RepositoryListResult<Skill> {
  try {
    return {
      data: rows.map(mapSkillRowToDomain),
      ok: true,
    };
  } catch {
    return adapterFailure("map skills");
  }
}

function mapSkillEvidenceRows(
  rows: readonly SkillEvidenceRow[],
): RepositoryListResult<SkillEvidence> {
  try {
    return {
      data: rows.map(mapSkillEvidenceRowToDomain),
      ok: true,
    };
  } catch {
    return adapterFailure("map skill evidence");
  }
}

function mapTaskSkillLinkRows(
  rows: readonly TaskSkillLinkRow[],
): RepositoryListResult<TaskSkillLink> {
  return {
    data: rows.map(mapTaskSkillLinkRowToDomain),
    ok: true,
  };
}

async function verifyActiveSkillOwnership(
  client: SupabaseClientLike,
  userId: string,
  skillId: string,
): Promise<boolean> {
  const result = (await client
    .from(realDataTableNames.skills)
    .select("id")
    .eq("user_id", userId)
    .eq("id", skillId)
    .neq("status", "archived")
    .is("archived_at", null)
    .maybeSingle()) as SupabaseQueryResult<{ id: string }>;

  return Boolean(!result.error && result.data);
}

async function verifyActiveTaskOwnership(
  client: SupabaseClientLike,
  userId: string,
  taskId: string,
): Promise<boolean> {
  const result = (await client
    .from(realDataTableNames.tasks)
    .select("id")
    .eq("user_id", userId)
    .eq("id", taskId)
    .neq("status", "archived")
    .is("archived_at", null)
    .maybeSingle()) as SupabaseQueryResult<{ id: string }>;

  return Boolean(!result.error && result.data);
}

async function verifySkillOwnership(
  client: SupabaseClientLike,
  userId: string,
  skillId: string,
): Promise<boolean> {
  const result = (await client
    .from(realDataTableNames.skills)
    .select("id")
    .eq("user_id", userId)
    .eq("id", skillId)
    .maybeSingle()) as SupabaseQueryResult<{ id: string }>;

  return Boolean(!result.error && result.data);
}

async function loadTaskSkillLink(
  client: SupabaseClientLike,
  userId: string,
  input: { skillId: string; taskId: string },
): Promise<RepositoryResult<TaskSkillLink>> {
  const result = (await client
    .from(realDataTableNames.taskSkillLinks)
    .select("*")
    .eq("user_id", userId)
    .eq("task_id", input.taskId)
    .eq("skill_id", input.skillId)
    .maybeSingle()) as SupabaseQueryResult<TaskSkillLinkRow>;

  if (result.error) return adapterFailure("load task skill link");
  if (!result.data) return notFoundFailure("Task skill link");

  return {
    data: mapTaskSkillLinkRowToDomain(result.data),
    ok: true,
  };
}

export function createSupabaseSkillRepository(
  client: SupabaseClientLike,
): SkillRepository {
  return {
    async archiveSkill() {
      return validationFailure(
        "Skill writes require skill_development_command, command_id and expected development revision; Evidence is withdrawn, never deleted.",
      );
    },

    async createSkill() {
      return validationFailure(
        "Skill writes require skill_development_command, command_id and expected development revision; Evidence is withdrawn, never deleted.",
      );
    },

    async createSkillEvidence() {
      return validationFailure(
        "Skill writes require skill_development_command, command_id and expected development revision; Evidence is withdrawn, never deleted.",
      );
    },

    async deleteSkillEvidence() {
      return validationFailure(
        "Skill writes require skill_development_command, command_id and expected development revision; Evidence is withdrawn, never deleted.",
      );
    },

    async getActiveSkillsByUser(userId) {
      const result = (await client
        .from(realDataTableNames.skills)
        .select("*")
        .eq("user_id", userId)
        .neq("status", "archived")
        .is("archived_at", null)
        .order("updated_at", { ascending: false })) as SupabaseQueryResult<
        readonly SkillRow[]
      >;

      if (result.error) return adapterFailure("load active skills");

      return mapSkillRows(result.data ?? []);
    },

    async getSkillEvidenceByUser(userId) {
      const result = (await client
        .from(realDataTableNames.skillEvidence)
        .select("*")
        .is("withdrawn_at", null)
        .eq("user_id", userId)
        .order("evidence_date", { ascending: false })
        .order("created_at", { ascending: false })) as SupabaseQueryResult<
        readonly SkillEvidenceRow[]
      >;

      if (result.error) return adapterFailure("load skill evidence");

      return mapSkillEvidenceRows(result.data ?? []);
    },

    async getSkillEvidenceForSkill(input) {
      const skillOwned = await verifySkillOwnership(
        client,
        input.userId,
        input.skillId,
      );
      if (!skillOwned) return notFoundFailure("Skill");

      const result = (await client
        .from(realDataTableNames.skillEvidence)
        .select("*")
        .is("withdrawn_at", null)
        .eq("user_id", input.userId)
        .eq("skill_id", input.skillId)
        .order("evidence_date", { ascending: false })
        .order("created_at", { ascending: false })) as SupabaseQueryResult<
        readonly SkillEvidenceRow[]
      >;

      if (result.error) return adapterFailure("load skill evidence");

      return mapSkillEvidenceRows(result.data ?? []);
    },

    async getSkillsByUser(userId) {
      const result = (await client
        .from(realDataTableNames.skills)
        .select("*")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false })) as SupabaseQueryResult<
        readonly SkillRow[]
      >;

      if (result.error) return adapterFailure("load skills");

      return mapSkillRows(result.data ?? []);
    },

    async getTaskSkillLinksByUser(userId) {
      const result = (await client
        .from(realDataTableNames.taskSkillLinks)
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: true })) as SupabaseQueryResult<
        readonly TaskSkillLinkRow[]
      >;

      if (result.error) return adapterFailure("load task skill links");

      return mapTaskSkillLinkRows(result.data ?? []);
    },

    async linkTaskSkill(input) {
      const [taskOwned, skillOwned] = await Promise.all([
        verifyActiveTaskOwnership(client, input.userId, input.taskId),
        verifyActiveSkillOwnership(client, input.userId, input.skillId),
      ]);
      if (!taskOwned) return notFoundFailure("Task");
      if (!skillOwned) return notFoundFailure("Skill");

      const result = (await client
        .from(realDataTableNames.taskSkillLinks)
        .upsert(mapTaskSkillLinkToInsert(input, input.userId), {
          ignoreDuplicates: true,
          onConflict: "user_id,task_id,skill_id",
        })
        .select("*")
        .maybeSingle()) as SupabaseQueryResult<TaskSkillLinkRow>;

      if (result.error) return adapterFailure("link task skill");
      if (result.data) {
        return {
          data: mapTaskSkillLinkRowToDomain(result.data),
          ok: true,
        };
      }

      return loadTaskSkillLink(client, input.userId, input);
    },

    async unlinkTaskSkill(input) {
      const [taskOwned, skillOwned] = await Promise.all([
        verifyActiveTaskOwnership(client, input.userId, input.taskId),
        verifyActiveSkillOwnership(client, input.userId, input.skillId),
      ]);
      if (!taskOwned) return notFoundFailure("Task");
      if (!skillOwned) return notFoundFailure("Skill");

      const current = await loadTaskSkillLink(client, input.userId, input);
      if (!current.ok) return current;

      const result = (await client
        .from(realDataTableNames.taskSkillLinks)
        .delete()
        .eq("user_id", input.userId)
        .eq("task_id", input.taskId)
        .eq("skill_id", input.skillId)
        .select("*")
        .single()) as SupabaseQueryResult<TaskSkillLinkRow>;

      if (result.error) return adapterFailure("unlink task skill");

      return {
        data: result.data
          ? mapTaskSkillLinkRowToDomain(result.data)
          : current.data,
        ok: true,
      };
    },

    async updateSkill() {
      return validationFailure(
        "Skill writes require skill_development_command, command_id and expected development revision; Evidence is withdrawn, never deleted.",
      );
    },

    async updateSkillEvidence() {
      return validationFailure(
        "Skill writes require skill_development_command, command_id and expected development revision; Evidence is withdrawn, never deleted.",
      );
    },
  };
}
