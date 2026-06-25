import type {
  AreaId,
  EntityId,
  ProfileId,
  ResourceId,
  UserId,
} from "../domain/ids";
import {
  privacyClasses,
  resourceRelationTargetTypes,
  resourceRelationTypes,
  resourceStatuses,
  resourceTypes,
  type PrivacyClass,
  type ResourceRelationTargetType,
  type ResourceRelationType,
  type ResourceStatus,
  type ResourceType,
} from "../domain/resource";
import {
  optionalBoolean,
  optionalEnum,
  optionalString,
  requiredEnum,
  requiredString,
  asInputRecord,
  defineInputSchema,
  finishSchema,
  type SchemaIssue,
} from "./schema-contract";

export type CreateResourceInput = {
  userId: UserId;
  profileId: ProfileId;
  areaId?: AreaId;
  title: string;
  body?: string;
  url?: string;
  type: ResourceType;
  status?: ResourceStatus;
  privacyClass?: PrivacyClass;
  source?: string;
  context?: string;
  reviewNeeded?: boolean;
};

export type LinkResourceInput = {
  userId: UserId;
  profileId: ProfileId;
  resourceId: ResourceId;
  targetType: ResourceRelationTargetType;
  targetId: EntityId;
  relationType: ResourceRelationType;
};

export const createResourceInputSchema =
  defineInputSchema<CreateResourceInput>(
    "createResourceInputSchema",
    (input) => {
      const issues: SchemaIssue[] = [];
      const record = asInputRecord(input, issues);

      return finishSchema(
        {
          areaId: optionalString(record, "areaId", issues) as
            | AreaId
            | undefined,
          body: optionalString(record, "body", issues),
          context: optionalString(record, "context", issues),
          privacyClass: optionalEnum(
            record,
            "privacyClass",
            privacyClasses,
            issues,
          ),
          profileId: requiredString(record, "profileId", issues) as ProfileId,
          reviewNeeded: optionalBoolean(record, "reviewNeeded", issues),
          source: optionalString(record, "source", issues),
          status: optionalEnum(record, "status", resourceStatuses, issues),
          title: requiredString(record, "title", issues, 2),
          type: requiredEnum(record, "type", resourceTypes, issues),
          url: optionalString(record, "url", issues),
          userId: requiredString(record, "userId", issues) as UserId,
        },
        issues,
      );
    },
  );

export const linkResourceInputSchema = defineInputSchema<LinkResourceInput>(
  "linkResourceInputSchema",
  (input) => {
    const issues: SchemaIssue[] = [];
    const record = asInputRecord(input, issues);

    return finishSchema(
      {
        profileId: requiredString(record, "profileId", issues) as ProfileId,
        relationType: requiredEnum(
          record,
          "relationType",
          resourceRelationTypes,
          issues,
        ),
        resourceId: requiredString(record, "resourceId", issues) as ResourceId,
        targetId: requiredString(record, "targetId", issues) as EntityId,
        targetType: requiredEnum(
          record,
          "targetType",
          resourceRelationTargetTypes,
          issues,
        ),
        userId: requiredString(record, "userId", issues) as UserId,
      },
      issues,
    );
  },
);
