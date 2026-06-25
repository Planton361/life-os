export const repositoryErrorCodes = [
  "validation_error",
  "unauthorized",
  "forbidden",
  "not_found",
  "conflict",
  "transaction_failed",
  "adapter_unavailable",
] as const;

export type RepositoryErrorCode = (typeof repositoryErrorCodes)[number];

export type RepositoryError = {
  code: RepositoryErrorCode;
  message: string;
  fieldErrors?: Record<string, string>;
};

export type RepositoryResult<TData> =
  | {
      ok: true;
      data: TData;
    }
  | {
      ok: false;
      error: RepositoryError;
    };

export type RepositoryListResult<TData> = RepositoryResult<readonly TData[]>;
