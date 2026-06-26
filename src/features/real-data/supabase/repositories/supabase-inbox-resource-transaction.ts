import type { CreateResourceFromInboxTransaction } from "../../repositories";
import type { RepositoryResult } from "../../repositories/repository-result";
import type {
  Database,
  SupabaseClientLike,
  SupabaseQueryResult,
} from "../database.types";
import { mapResourceRowToDomain } from "../mappers";
import type { ResourceRow } from "../row-types";

type RepositoryFailure = RepositoryResult<never>;

type CreateResourceFromInboxArgs =
  Database["public"]["Functions"]["create_resource_from_inbox"]["Args"];

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

export function createSupabaseInboxResourceTransaction(
  client: SupabaseClientLike,
): CreateResourceFromInboxTransaction {
  return async (input) => {
    const scopeFailure = profileScopeFailure(input.userId, input.profileId);
    if (scopeFailure) return scopeFailure;

    const args: CreateResourceFromInboxArgs = {
      p_inbox_item_id: input.inboxItemId,
      p_title: input.title,
      p_type: input.type,
    };

    if (input.areaId !== undefined) args.p_area_id = input.areaId;
    if (input.body !== undefined || input.context !== undefined) {
      args.p_summary = input.body ?? input.context;
    }
    if (input.reviewNeeded !== undefined) {
      args.p_review_needed = input.reviewNeeded;
    }
    if (input.url !== undefined) args.p_url = input.url;

    const result = (await client.rpc(
      "create_resource_from_inbox",
      args,
    )) as SupabaseQueryResult<ResourceRow>;

    if (result.error) return adapterFailure("create resource from inbox");
    if (!result.data) return notFoundFailure("Resource");

    return {
      data: mapResourceRowToDomain(result.data),
      ok: true,
    };
  };
}
