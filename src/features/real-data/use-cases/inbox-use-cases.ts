import type { InboxItem, Task } from "../domain";
import {
  captureInboxItemInputSchema,
  triageInboxItemToTaskInputSchema,
  type CaptureInboxItemInput,
  type TriageInboxItemToTaskInput,
} from "../schemas";
import { defineUseCaseContract, type UseCaseHandler } from "./use-case-contract";

export type CaptureInboxItemOutput = {
  inboxItem: InboxItem;
};

export type TriageInboxItemToTaskOutput = {
  inboxItem: InboxItem;
  task: Task;
};

export type CaptureInboxItemUseCase = UseCaseHandler<
  CaptureInboxItemInput,
  CaptureInboxItemOutput
>;

export type TriageInboxItemToTaskUseCase = UseCaseHandler<
  TriageInboxItemToTaskInput,
  TriageInboxItemToTaskOutput
>;

export const captureInboxItemContract = defineUseCaseContract<
  CaptureInboxItemInput,
  CaptureInboxItemOutput
>({
  affectedReadModels: ["inbox", "dashboard", "today"],
  inputSchema: captureInboxItemInputSchema,
  name: "captureInboxItem",
  notes: [
    "Capture writes one InboxItem.",
    "No task, project, or resource is created during capture.",
  ],
  repositories: ["inbox"],
  transaction: "single_write",
});

export const triageInboxItemToTaskContract = defineUseCaseContract<
  TriageInboxItemToTaskInput,
  TriageInboxItemToTaskOutput
>({
  affectedReadModels: [
    "inbox",
    "tasks",
    "today",
    "calendar",
    "dashboard",
    "portfolio",
  ],
  inputSchema: triageInboxItemToTaskInputSchema,
  name: "triageInboxItemToTask",
  notes: [
    "Triage creates a Task and marks the InboxItem as triaged.",
    "The Task stores sourceInboxItemId for traceability.",
  ],
  repositories: ["inbox", "tasks"],
  transaction: "transaction_required",
});
