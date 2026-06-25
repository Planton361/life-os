import type { Task } from "../domain";
import {
  carryTaskForwardInputSchema,
  completeTaskInputSchema,
  createTaskInputSchema,
  scheduleTaskInputSchema,
  updateTaskInputSchema,
  type CarryTaskForwardInput,
  type CompleteTaskInput,
  type CreateTaskInput,
  type ScheduleTaskInput,
  type UpdateTaskInput,
} from "../schemas";
import { defineUseCaseContract, type UseCaseHandler } from "./use-case-contract";

export type TaskOutput = {
  task: Task;
};

export type CreateTaskUseCase = UseCaseHandler<CreateTaskInput, TaskOutput>;
export type UpdateTaskUseCase = UseCaseHandler<UpdateTaskInput, TaskOutput>;
export type ScheduleTaskUseCase = UseCaseHandler<ScheduleTaskInput, TaskOutput>;
export type CompleteTaskUseCase = UseCaseHandler<CompleteTaskInput, TaskOutput>;
export type CarryTaskForwardUseCase = UseCaseHandler<
  CarryTaskForwardInput,
  TaskOutput
>;

export const createTaskContract = defineUseCaseContract<
  CreateTaskInput,
  TaskOutput
>({
  affectedReadModels: [
    "tasks",
    "today",
    "calendar",
    "dashboard",
    "portfolio",
    "area_context",
  ],
  inputSchema: createTaskInputSchema,
  name: "createTask",
  notes: ["Creates one canonical Task."],
  repositories: ["tasks"],
  transaction: "single_write",
});

export const updateTaskContract = defineUseCaseContract<
  UpdateTaskInput,
  TaskOutput
>({
  affectedReadModels: [
    "tasks",
    "today",
    "calendar",
    "dashboard",
    "portfolio",
    "area_context",
  ],
  inputSchema: updateTaskInputSchema,
  name: "updateTask",
  notes: ["Updates canonical task fields without page-specific copies."],
  repositories: ["tasks"],
  transaction: "single_write",
});

export const scheduleTaskContract = defineUseCaseContract<
  ScheduleTaskInput,
  TaskOutput
>({
  affectedReadModels: ["tasks", "today", "calendar", "dashboard"],
  inputSchema: scheduleTaskInputSchema,
  name: "scheduleTask",
  notes: [
    "plannedDate is a local date.",
    "scheduledStartAt is optional and only creates a time-grid block when set.",
  ],
  repositories: ["tasks"],
  transaction: "single_write",
});

export const completeTaskContract = defineUseCaseContract<
  CompleteTaskInput,
  TaskOutput
>({
  affectedReadModels: [
    "tasks",
    "today",
    "calendar",
    "dashboard",
    "portfolio",
    "projects",
    "goals",
  ],
  inputSchema: completeTaskInputSchema,
  name: "completeTask",
  notes: ["Sets status done and completedAt on the canonical Task."],
  repositories: ["tasks"],
  transaction: "single_write",
});

export const carryTaskForwardContract = defineUseCaseContract<
  CarryTaskForwardInput,
  TaskOutput
>({
  affectedReadModels: ["tasks", "today", "calendar", "dashboard"],
  inputSchema: carryTaskForwardInputSchema,
  name: "carryTaskForward",
  notes: [
    "Carry Forward does not duplicate the Task.",
    "The open Task receives a new plannedDate and the prior Daily Log records the event.",
  ],
  repositories: ["tasks", "dailyLogs"],
  transaction: "transaction_required",
});
