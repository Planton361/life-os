import type { CodingRepository } from "./types";

export type GitHubRepositoryApiShape = {
  id: number;
  full_name: string;
  private: boolean;
  html_url: string;
  description: string | null;
  default_branch: string;
  language: string | null;
  pushed_at: string | null;
  open_issues_count: number;
  topics?: string[];
};

export type GitHubRepositoryMappingInput = {
  repository: GitHubRepositoryApiShape;
  linkedProjectId?: string;
  linkedProjectTitle?: string;
  nextAction?: string;
};

export function mapGitHubRepositoryStub(
  input: GitHubRepositoryMappingInput,
): Pick<
  CodingRepository,
  | "id"
  | "fullName"
  | "provider"
  | "visibility"
  | "defaultBranch"
  | "language"
  | "description"
  | "linkedProjectId"
  | "linkedProjectTitle"
  | "nextAction"
  | "lastActivityAt"
> {
  return {
    id: `github-${input.repository.id}`,
    fullName: input.repository.full_name,
    provider: "github",
    visibility: input.repository.private ? "private" : "public",
    defaultBranch: input.repository.default_branch,
    language: input.repository.language ?? undefined,
    description: input.repository.description ?? "No description from GitHub.",
    linkedProjectId: input.linkedProjectId,
    linkedProjectTitle: input.linkedProjectTitle,
    nextAction: input.nextAction,
    lastActivityAt: input.repository.pushed_at ?? new Date(0).toISOString(),
  };
}

// Future GitHub sync boundary:
// - This file is server-side preparation only and performs no fetches.
// - Real GitHub tokens or OAuth credentials must stay server-side.
// - Client components must never receive tokens or call GitHub APIs directly.
// - Later mappings can use: repository id, full_name, private/public, html_url,
//   description, default_branch, language, pushed_at, open_issues_count, topics.
