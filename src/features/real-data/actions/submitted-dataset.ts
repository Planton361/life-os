import "server-only";
import { cookies } from "next/headers";
import { withDatasetSubmission } from "../runtime/submitted-dataset-epoch";
// FormData admission also covers progressively submitted native Server Action
// forms. Strip the technical field before existing strict domain validation.
export function withSubmittedDatasetEpoch<T>(
  data: FormData,
  body: () => Promise<T>,
): Promise<T> {
  const value = data.get("__life_dataset_epoch");
  data.delete("__life_dataset_epoch");
  return withDatasetSubmission(
    typeof value === "string" ? value : undefined,
    async (request) => {
      try {
        return await body();
      } finally {
        if (request.stale)
          (await cookies()).set("life-preview-stale", "1", {
            secure: true,
            sameSite: "strict",
            path: "/",
            maxAge: 300,
          });
      }
    },
  );
}
