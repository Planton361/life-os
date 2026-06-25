import type { Resource, ResourceRelation } from "../domain";
import {
  createResourceInputSchema,
  linkResourceInputSchema,
  type CreateResourceInput,
  type LinkResourceInput,
} from "../schemas";
import { defineUseCaseContract, type UseCaseHandler } from "./use-case-contract";

export type CreateResourceOutput = {
  resource: Resource;
};

export type LinkResourceOutput = {
  resourceRelation: ResourceRelation;
};

export type CreateResourceUseCase = UseCaseHandler<
  CreateResourceInput,
  CreateResourceOutput
>;

export type LinkResourceUseCase = UseCaseHandler<
  LinkResourceInput,
  LinkResourceOutput
>;

export const createResourceContract = defineUseCaseContract<
  CreateResourceInput,
  CreateResourceOutput
>({
  affectedReadModels: ["resources", "area_context"],
  inputSchema: createResourceInputSchema,
  name: "createResource",
  notes: ["Creates one canonical Resource with privacy and review metadata."],
  repositories: ["resources"],
  transaction: "single_write",
});

export const linkResourceContract = defineUseCaseContract<
  LinkResourceInput,
  LinkResourceOutput
>({
  affectedReadModels: ["resources", "area_context", "portfolio"],
  inputSchema: linkResourceInputSchema,
  name: "linkResource",
  notes: [
    "Links a Resource to one target entity.",
    "Adapters must validate same-profile ownership for both sides.",
  ],
  repositories: ["resources"],
  transaction: "single_write",
});
