import type { Skill, SkillEvidence, SkillEvidenceSourceType } from "../../domain";
import type { SkillRepository } from "../../repositories";
import type {
  RepositoryListResult,
  RepositoryResult,
} from "../../repositories/repository-result";
import {
  mapSkillCreateInputToInsert,
  mapSkillEvidenceCreateInputToInsert,
  mapSkillEvidenceRowToDomain,
  mapSkillEvidenceUpdateInputToPatch,
  mapSkillRowToDomain,
  mapSkillUpdateInputToPatch,
} from "../mappers";
import { realDataTableNames } from "../database.types";
import type {
  SupabaseClientLike,
  SupabaseQueryResult,
} from "../database.types";
import type {
  SkillEvidenceRow,
  SkillEvidenceUpdate,
  SkillRow,
  SkillUpdate,
} from "../row-types";

type RepositoryFailure = RepositoryResult<never>;

type SourceReference = {
  sourceId: string | null;
  sourceType: SkillEvidenceSourceType;
};

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

async function verifyAreaOwnership(
  client: SupabaseClientLike,
  userId: string,
  areaId: string | null | undefined,
): Promise<boolean> {
  if (areaId === undefined || areaId === null) return true;

  const result = (await client
    .from("areas")
    .select("id")
    .eq("user_id", userId)
    .eq("id", areaId)
    .is("archived_at", null)
    .maybeSingle()) as SupabaseQueryResult<{ id: string }>;

  return Boolean(!result.error && result.data);
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

async function verifySourceOwnership(
  client: SupabaseClientLike,
  userId: string,
  reference: SourceReference,
): Promise<RepositoryFailure | null> {
  if (reference.sourceType === "manual_note") {
    return reference.sourceId === null
      ? null
      : validationFailure("Manual skill evidence must not include a source.");
  }

  if (!reference.sourceId) {
    return validationFailure("Skill evidence source is required.");
  }

  const tableNameBySourceType = {
    goal: realDataTableNames.goals,
    project: realDataTableNames.projects,
    resource: realDataTableNames.resources,
    task: realDataTableNames.tasks,
  } as const;

  const result = (await client
    .from(tableNameBySourceType[reference.sourceType])
    .select("id")
    .eq("user_id", userId)
    .eq("id", reference.sourceId)
    .is("archived_at", null)
    .maybeSingle()) as SupabaseQueryResult<{ id: string }>;

  if (result.error) return adapterFailure("verify skill evidence source");

  return result.data ? null : notFoundFailure("Skill evidence source");
}

async function loadSkillById(
  client: SupabaseClientLike,
  userId: string,
  skillId: string,
): Promise<RepositoryResult<Skill>> {
  const result = (await client
    .from(realDataTableNames.skills)
    .select("*")
    .eq("user_id", userId)
    .eq("id", skillId)
    .maybeSingle()) as SupabaseQueryResult<SkillRow>;

  if (result.error) return adapterFailure("load skill");
  if (!result.data) return notFoundFailure("Skill");

  try {
    return {
      data: mapSkillRowToDomain(result.data),
      ok: true,
    };
  } catch {
    return adapterFailure("map skill");
  }
}

async function loadSkillEvidenceById(
  client: SupabaseClientLike,
  userId: string,
  evidenceId: string,
): Promise<RepositoryResult<SkillEvidenceRow>> {
  const result = (await client
    .from(realDataTableNames.skillEvidence)
    .select("*")
    .eq("user_id", userId)
    .eq("id", evidenceId)
    .maybeSingle()) as SupabaseQueryResult<SkillEvidenceRow>;

  if (result.error) return adapterFailure("load skill evidence");
  if (!result.data) return notFoundFailure("Skill evidence");

  return {
    data: result.data,
    ok: true,
  };
}

async function updateSkillById(
  client: SupabaseClientLike,
  userId: string,
  skillId: string,
  patch: SkillUpdate,
  operation: string,
): Promise<RepositoryResult<Skill>> {
  if (Object.keys(patch).length === 0) {
    return loadSkillById(client, userId, skillId);
  }

  const result = (await client
    .from(realDataTableNames.skills)
    .update(patch)
    .eq("user_id", userId)
    .eq("id", skillId)
    .select("*")
    .single()) as SupabaseQueryResult<SkillRow>;

  if (result.error) return adapterFailure(operation);
  if (!result.data) return notFoundFailure("Skill");

  try {
    return {
      data: mapSkillRowToDomain(result.data),
      ok: true,
    };
  } catch {
    return adapterFailure("map skill");
  }
}

async function updateSkillEvidenceById(
  client: SupabaseClientLike,
  userId: string,
  evidenceId: string,
  patch: SkillEvidenceUpdate,
  operation: string,
): Promise<RepositoryResult<SkillEvidence>> {
  if (Object.keys(patch).length === 0) {
    const current = await loadSkillEvidenceById(client, userId, evidenceId);
    if (!current.ok) return current;

    try {
      return {
        data: mapSkillEvidenceRowToDomain(current.data),
        ok: true,
      };
    } catch {
      return adapterFailure("map skill evidence");
    }
  }

  const result = (await client
    .from(realDataTableNames.skillEvidence)
    .update(patch)
    .eq("user_id", userId)
    .eq("id", evidenceId)
    .select("*")
    .single()) as SupabaseQueryResult<SkillEvidenceRow>;

  if (result.error) return adapterFailure(operation);
  if (!result.data) return notFoundFailure("Skill evidence");

  try {
    return {
      data: mapSkillEvidenceRowToDomain(result.data),
      ok: true,
    };
  } catch {
    return adapterFailure("map skill evidence");
  }
}

export function createSupabaseSkillRepository(
  client: SupabaseClientLike,
): SkillRepository {
  return {
    async archiveSkill(input) {
      return updateSkillById(
        client,
        input.userId,
        input.skillId,
        {
          archived_at: new Date().toISOString(),
          status: "archived",
        },
        "archive skill",
      );
    },

    async createSkill(input) {
      const areaOwned = await verifyAreaOwnership(
        client,
        input.userId,
        input.areaId,
      );
      if (!areaOwned) return notFoundFailure("Area");

      const result = (await client
        .from(realDataTableNames.skills)
        .insert(mapSkillCreateInputToInsert(input, input.userId))
        .select("*")
        .single()) as SupabaseQueryResult<SkillRow>;

      if (result.error) return adapterFailure("create skill");
      if (!result.data) return notFoundFailure("Skill");

      try {
        return {
          data: mapSkillRowToDomain(result.data),
          ok: true,
        };
      } catch {
        return adapterFailure("map skill");
      }
    },

    async createSkillEvidence(input) {
      const skillOwned = await verifyActiveSkillOwnership(
        client,
        input.userId,
        input.skillId,
      );
      if (!skillOwned) return notFoundFailure("Skill");

      const sourceFailure = await verifySourceOwnership(client, input.userId, {
        sourceId: input.sourceId ?? null,
        sourceType: input.sourceType,
      });
      if (sourceFailure) return sourceFailure;

      const result = (await client
        .from(realDataTableNames.skillEvidence)
        .insert(mapSkillEvidenceCreateInputToInsert(input, input.userId))
        .select("*")
        .single()) as SupabaseQueryResult<SkillEvidenceRow>;

      if (result.error) return adapterFailure("create skill evidence");
      if (!result.data) return notFoundFailure("Skill evidence");

      try {
        return {
          data: mapSkillEvidenceRowToDomain(result.data),
          ok: true,
        };
      } catch {
        return adapterFailure("map skill evidence");
      }
    },

    async deleteSkillEvidence(input) {
      const current = await loadSkillEvidenceById(
        client,
        input.userId,
        input.evidenceId,
      );
      if (!current.ok) return current;

      const deleted = (await client
        .from(realDataTableNames.skillEvidence)
        .delete()
        .eq("user_id", input.userId)
        .eq("id", input.evidenceId)
        .select("*")
        .single()) as SupabaseQueryResult<SkillEvidenceRow>;

      if (deleted.error) return adapterFailure("delete skill evidence");

      try {
        return {
          data: mapSkillEvidenceRowToDomain(deleted.data ?? current.data),
          ok: true,
        };
      } catch {
        return adapterFailure("map skill evidence");
      }
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

    async updateSkill(input) {
      const areaOwned = await verifyAreaOwnership(
        client,
        input.userId,
        input.areaId,
      );
      if (!areaOwned) return notFoundFailure("Area");

      return updateSkillById(
        client,
        input.userId,
        input.skillId,
        mapSkillUpdateInputToPatch(input),
        "update skill",
      );
    },

    async updateSkillEvidence(input) {
      const current = await loadSkillEvidenceById(
        client,
        input.userId,
        input.evidenceId,
      );
      if (!current.ok) return current;

      const nextSkillId = input.skillId ?? current.data.skill_id;
      const skillOwned = await verifyActiveSkillOwnership(
        client,
        input.userId,
        nextSkillId,
      );
      if (!skillOwned) return notFoundFailure("Skill");

      const nextSourceType = input.sourceType ?? current.data.source_type;
      const nextSourceId =
        input.sourceId !== undefined ? input.sourceId : current.data.source_id;
      const sourceFailure = await verifySourceOwnership(client, input.userId, {
        sourceId: nextSourceId,
        sourceType: nextSourceType as SkillEvidenceSourceType,
      });
      if (sourceFailure) return sourceFailure;

      return updateSkillEvidenceById(
        client,
        input.userId,
        input.evidenceId,
        mapSkillEvidenceUpdateInputToPatch(input),
        "update skill evidence",
      );
    },
  };
}
