import { z } from "zod";

export const scheduleSourceTypes = ["meal", "review", "running_plan_item", "strength_plan"] as const;

export const scheduleSourceInputSchema = z.object({
  durationMinutes: z.coerce.number().int().min(1).max(1440),
  plannedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  scheduledStartAt: z.string().datetime({ offset: true }),
  sourceId: z.string().uuid(),
  sourceType: z.enum(scheduleSourceTypes),
});

export type ScheduleSourceInput = z.infer<typeof scheduleSourceInputSchema>;
