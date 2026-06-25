import type { InputSchema } from "../schemas";
import type { RepositoryResult } from "../repositories";
import type { RealDataRepository } from "../repositories/real-data-repository";

export const transactionRequirements = [
  "none",
  "single_write",
  "transaction_required",
] as const;

export type TransactionRequirement = (typeof transactionRequirements)[number];

export const repositoryNames = [
  "profiles",
  "inbox",
  "tasks",
  "projects",
  "goals",
  "dailyLogs",
  "resources",
] as const;

export type RepositoryName = (typeof repositoryNames)[number];

export const affectedReadModels = [
  "dashboard",
  "inbox",
  "today",
  "calendar",
  "portfolio",
  "tasks",
  "projects",
  "goals",
  "resources",
  "area_context",
] as const;

export type AffectedReadModel = (typeof affectedReadModels)[number];

export type UseCaseContext = {
  repository: RealDataRepository;
};

export type UseCaseHandler<TInput, TOutput> = (
  input: TInput,
  context: UseCaseContext,
) => Promise<RepositoryResult<TOutput>>;

export type UseCaseContract<TInput, TOutput> = {
  name: string;
  inputSchema: InputSchema<TInput>;
  repositories: readonly RepositoryName[];
  transaction: TransactionRequirement;
  affectedReadModels: readonly AffectedReadModel[];
  notes: readonly string[];
  handler?: UseCaseHandler<TInput, TOutput>;
};

export function defineUseCaseContract<TInput, TOutput>(
  contract: UseCaseContract<TInput, TOutput>,
) {
  return contract;
}
