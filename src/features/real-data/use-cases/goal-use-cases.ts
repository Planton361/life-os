import type { Goal } from "../domain";
import {
  createGoalInputSchema,
  updateGoalInputSchema,
  type CreateGoalInput,
  type UpdateGoalInput,
} from "../schemas";
import { defineUseCaseContract, type UseCaseHandler } from "./use-case-contract";

export type GoalOutput = {
  goal: Goal;
};

export type CreateGoalUseCase = UseCaseHandler<CreateGoalInput, GoalOutput>;
export type UpdateGoalUseCase = UseCaseHandler<UpdateGoalInput, GoalOutput>;

export const createGoalContract = defineUseCaseContract<
  CreateGoalInput,
  GoalOutput
>({
  affectedReadModels: ["goals", "portfolio", "dashboard", "today"],
  inputSchema: createGoalInputSchema,
  name: "createGoal",
  notes: ["Creates one canonical Goal."],
  repositories: ["goals"],
  transaction: "single_write",
});

export const updateGoalContract = defineUseCaseContract<
  UpdateGoalInput,
  GoalOutput
>({
  affectedReadModels: ["goals", "portfolio", "dashboard", "today"],
  inputSchema: updateGoalInputSchema,
  name: "updateGoal",
  notes: ["Updates canonical Goal fields and preserves linked Projects/Tasks."],
  repositories: ["goals"],
  transaction: "single_write",
});
