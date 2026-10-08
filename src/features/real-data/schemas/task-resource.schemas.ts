import { z } from "./schema-contract";

export const taskResourceDraftSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("note"),
    body: z
      .string()
      .trim()
      .min(1, "Bitte eine Notiz eingeben.")
      .max(600, "Notizen dürfen höchstens 600 Zeichen enthalten."),
  }),
  z.object({
    type: z.literal("link"),
    url: z
      .string()
      .trim()
      .max(2048)
      .url("Bitte eine gültige HTTP(S)-URL eingeben.")
      .refine((value) => {
        try {
          const url = new URL(value);
          return (
            ["http:", "https:"].includes(url.protocol) &&
            !url.username &&
            !url.password
          );
        } catch {
          return false;
        }
      }, "Bitte eine HTTP(S)-URL ohne Zugangsdaten eingeben."),
    title: z
      .string()
      .trim()
      .max(160)
      .refine(
        (value) => !value || value.length >= 2,
        "Titel muss mindestens zwei Zeichen enthalten.",
      )
      .default(""),
  }),
]);
export const createTaskResourceInputSchema = z.object({
  userId: z.uuid(),
  profileId: z.uuid(),
  taskId: z.uuid(),
  resourceId: z.uuid(),
  draft: taskResourceDraftSchema,
});
export type CreateTaskResourceInput = z.infer<
  typeof createTaskResourceInputSchema
>;

export function taskResourceFields(draft: CreateTaskResourceInput["draft"]) {
  if (draft.type === "note") {
    const line = draft.body.split(/\r?\n/)[0].trim().slice(0, 80);
    return {
      type: draft.type,
      title: line.length >= 2 ? line : "Task-Notiz",
      body: draft.body,
      url: null,
    };
  }
  const hostname = new URL(draft.url).hostname;
  return {
    type: draft.type,
    title: draft.title || (hostname.length >= 2 ? hostname : draft.url),
    body: null,
    url: draft.url,
  };
}
