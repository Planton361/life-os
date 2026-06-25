import type { Project } from "../domain";
import {
  createProjectInputSchema,
  updateProjectInputSchema,
  type CreateProjectInput,
  type UpdateProjectInput,
} from "../schemas";
import { defineUseCaseContract, type UseCaseHandler } from "./use-case-contract";

export type ProjectOutput = {
  project: Project;
};

export type CreateProjectUseCase = UseCaseHandler<
  CreateProjectInput,
  ProjectOutput
>;

export type UpdateProjectUseCase = UseCaseHandler<
  UpdateProjectInput,
  ProjectOutput
>;

export const createProjectContract = defineUseCaseContract<
  CreateProjectInput,
  ProjectOutput
>({
  affectedReadModels: ["projects", "portfolio", "dashboard", "today", "calendar"],
  inputSchema: createProjectInputSchema,
  name: "createProject",
  notes: ["Creates one canonical Project."],
  repositories: ["projects"],
  transaction: "single_write",
});

export const updateProjectContract = defineUseCaseContract<
  UpdateProjectInput,
  ProjectOutput
>({
  affectedReadModels: ["projects", "portfolio", "dashboard", "today", "calendar"],
  inputSchema: updateProjectInputSchema,
  name: "updateProject",
  notes: ["Updates canonical Project fields and preserves linked Tasks."],
  repositories: ["projects"],
  transaction: "single_write",
});
