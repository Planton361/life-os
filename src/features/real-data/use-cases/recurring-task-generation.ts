import type {
  LocalDateString,
  RecurringTaskTemplate,
  RecurrenceRule,
  RecurrenceRuleV1,
  Task,
  UserId,
  ProfileId,
} from "../domain";
import type {
  RecurringTaskTemplateRepository,
  TaskRepository,
} from "../repositories";
import type { RepositoryResult } from "../repositories/repository-result";
import {
  generateRecurringTaskInstancesForDateActionInputSchema,
  generateRecurringTaskInstancesForRangeActionInputSchema,
  type GenerateRecurringTaskInstancesForDateActionInput,
  type GenerateRecurringTaskInstancesForRangeActionInput,
} from "../schemas";
import { defineUseCaseContract } from "./use-case-contract";

const millisecondsPerDay = 86_400_000;
const maxGenerationRangeDays = 31;

type SupportedRecurrenceRuleResult =
  | {
      ok: true;
      rule: RecurrenceRuleV1;
    }
  | {
      ok: false;
      reason: "unsupported_recurrence_rule";
    };

export type RecurringTaskGenerationSkippedTemplate = {
  templateId: string;
  reason: "generation_failed" | "unsupported_recurrence_rule";
};

export type GenerateRecurringTaskInstancesForDateInput = {
  userId: UserId;
  profileId: ProfileId;
  date: LocalDateString;
};

export type GenerateRecurringTaskInstancesForRangeInput = {
  userId: UserId;
  profileId: ProfileId;
  startDate: LocalDateString;
  endDate: LocalDateString;
};

export type GenerateRecurringTaskInstancesOutput = {
  date?: LocalDateString;
  startDate?: LocalDateString;
  endDate?: LocalDateString;
  generated: Task[];
  existing: Task[];
  skippedTemplates: RecurringTaskGenerationSkippedTemplate[];
};

export type RecurringTaskGenerationContext = {
  recurringTaskTemplates: RecurringTaskTemplateRepository;
  tasks: TaskRepository;
};

function repositoryFailure(
  code: "adapter_unavailable" | "validation_error",
  message: string,
): RepositoryResult<never> {
  return {
    error: {
      code,
      message,
    },
    ok: false,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function parseRecurrenceRuleV1(
  rule: RecurrenceRule,
): SupportedRecurrenceRuleResult {
  if (!isRecord(rule)) {
    return {
      ok: false,
      reason: "unsupported_recurrence_rule",
    };
  }

  if (rule.version !== "v1") {
    return {
      ok: false,
      reason: "unsupported_recurrence_rule",
    };
  }

  const interval =
    typeof rule.interval === "number" &&
    Number.isInteger(rule.interval) &&
    rule.interval > 0
      ? rule.interval
      : undefined;

  if (rule.frequency === "daily") {
    return {
      ok: true,
      rule: {
        frequency: "daily",
        interval,
        version: "v1",
      },
    };
  }

  if (
    rule.frequency === "weekly" &&
    Array.isArray(rule.byWeekday) &&
    rule.byWeekday.length > 0 &&
    rule.byWeekday.every(
      (weekday) =>
        typeof weekday === "number" &&
        Number.isInteger(weekday) &&
        weekday >= 1 &&
        weekday <= 7,
    )
  ) {
    return {
      ok: true,
      rule: {
        byWeekday: [...new Set(rule.byWeekday)],
        frequency: "weekly",
        interval,
        version: "v1",
      },
    };
  }

  return {
    ok: false,
    reason: "unsupported_recurrence_rule",
  };
}

function dayNumberFromIsoDate(date: LocalDateString) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const utcMs = Date.UTC(year, month - 1, day);
  const parsed = new Date(utcMs);

  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return null;
  }

  return Math.floor(utcMs / millisecondsPerDay);
}

function isoDateFromDayNumber(dayNumber: number): LocalDateString {
  return new Date(dayNumber * millisecondsPerDay)
    .toISOString()
    .slice(0, 10);
}

function isoWeekdayFromDayNumber(dayNumber: number) {
  const utcDay = new Date(dayNumber * millisecondsPerDay).getUTCDay();

  return utcDay === 0 ? 7 : utcDay;
}

function rangeLengthInDays(startDate: LocalDateString, endDate: LocalDateString) {
  const startDay = dayNumberFromIsoDate(startDate);
  const endDay = dayNumberFromIsoDate(endDate);

  if (startDay === null || endDay === null || endDay < startDay) return null;

  return endDay - startDay + 1;
}

function isDueForSupportedRule(
  rule: RecurrenceRuleV1,
  startsOn: LocalDateString,
  date: LocalDateString,
) {
  const startDay = dayNumberFromIsoDate(startsOn);
  const targetDay = dayNumberFromIsoDate(date);

  if (startDay === null || targetDay === null || targetDay < startDay) {
    return false;
  }

  const interval = rule.interval ?? 1;
  const daysSinceStart = targetDay - startDay;

  if (rule.frequency === "daily") {
    return daysSinceStart % interval === 0;
  }

  const weeksSinceStart = Math.floor(daysSinceStart / 7);

  return (
    weeksSinceStart % interval === 0 &&
    rule.byWeekday.includes(isoWeekdayFromDayNumber(targetDay))
  );
}

export function isTemplateDueOnDate(
  template: RecurringTaskTemplate,
  date: LocalDateString,
) {
  if (!template.isActive) return false;

  const targetDay = dayNumberFromIsoDate(date);
  const startDay = dayNumberFromIsoDate(template.startsOn);
  const endDay = template.endsOn ? dayNumberFromIsoDate(template.endsOn) : null;

  if (targetDay === null || startDay === null || targetDay < startDay) {
    return false;
  }

  if (endDay !== null && targetDay > endDay) return false;

  const parsedRule = parseRecurrenceRuleV1(template.recurrenceRule);
  if (!parsedRule.ok) return false;

  return isDueForSupportedRule(parsedRule.rule, template.startsOn, date);
}

export function getDueTemplateDates(
  template: RecurringTaskTemplate,
  rangeStart: LocalDateString,
  rangeEnd: LocalDateString,
) {
  const startDay = dayNumberFromIsoDate(rangeStart);
  const endDay = dayNumberFromIsoDate(rangeEnd);

  if (startDay === null || endDay === null || endDay < startDay) return [];

  const dates: LocalDateString[] = [];

  for (let day = startDay; day <= endDay; day += 1) {
    const date = isoDateFromDayNumber(day);

    if (isTemplateDueOnDate(template, date)) {
      dates.push(date);
    }
  }

  return dates;
}

function taskDescriptionFromTemplate(template: RecurringTaskTemplate) {
  return (
    [
      template.description,
      template.nextAction ? `Nächste Aktion: ${template.nextAction}` : null,
    ]
      .filter(Boolean)
      .join("\n\n") || null
  );
}

async function generateForTemplatesAndDates(
  input: GenerateRecurringTaskInstancesForRangeInput,
  dates: readonly LocalDateString[],
  templates: readonly RecurringTaskTemplate[],
  context: RecurringTaskGenerationContext,
): Promise<RepositoryResult<GenerateRecurringTaskInstancesOutput>> {
  const generated: Task[] = [];
  const existing: Task[] = [];
  const skippedTemplates: RecurringTaskGenerationSkippedTemplate[] = [];

  for (const template of templates) {
    const parsedRule = parseRecurrenceRuleV1(template.recurrenceRule);

    if (!parsedRule.ok) {
      skippedTemplates.push({
        reason: parsedRule.reason,
        templateId: template.id,
      });
      continue;
    }

    for (const date of dates) {
      if (!isTemplateDueOnDate(template, date)) continue;

      const result = await context.tasks.createGeneratedTaskInstance({
        areaId: template.areaId,
        description: taskDescriptionFromTemplate(template),
        durationMinutes: template.durationMinutes,
        energy: template.energy,
        goalId: template.goalId,
        instanceDate: date,
        priority: template.priority,
        profileId: input.profileId,
        projectId: template.projectId,
        templateId: template.id,
        title: template.title,
        userId: input.userId,
      });

      if (!result.ok) {
        skippedTemplates.push({
          reason: "generation_failed",
          templateId: template.id,
        });
        continue;
      }

      if (result.data.existing) {
        existing.push(result.data.task);
      } else {
        generated.push(result.data.task);
      }
    }
  }

  return {
    data: {
      endDate: input.endDate,
      existing,
      generated,
      skippedTemplates,
      startDate: input.startDate,
    },
    ok: true,
  };
}

export async function generateRecurringTaskInstancesForRange(
  input: GenerateRecurringTaskInstancesForRangeInput,
  context: RecurringTaskGenerationContext,
): Promise<RepositoryResult<GenerateRecurringTaskInstancesOutput>> {
  const rangeLength = rangeLengthInDays(input.startDate, input.endDate);

  if (rangeLength === null) {
    return repositoryFailure("validation_error", "Invalid generation range.");
  }

  if (rangeLength > maxGenerationRangeDays) {
    return repositoryFailure(
      "validation_error",
      `Generation range is limited to ${maxGenerationRangeDays} days.`,
    );
  }

  const templates =
    await context.recurringTaskTemplates.getActiveRecurringTaskTemplatesByUser(
      input.userId,
      input.profileId,
    );

  if (!templates.ok) return templates;

  const startDay = dayNumberFromIsoDate(input.startDate);
  const dates = Array.from({ length: rangeLength }, (_, index) =>
    isoDateFromDayNumber((startDay ?? 0) + index),
  );

  return generateForTemplatesAndDates(input, dates, templates.data, context);
}

export async function generateRecurringTaskInstancesForDate(
  input: GenerateRecurringTaskInstancesForDateInput,
  context: RecurringTaskGenerationContext,
): Promise<RepositoryResult<GenerateRecurringTaskInstancesOutput>> {
  const result = await generateRecurringTaskInstancesForRange(
    {
      endDate: input.date,
      profileId: input.profileId,
      startDate: input.date,
      userId: input.userId,
    },
    context,
  );

  if (!result.ok) return result;

  return {
    data: {
      date: input.date,
      existing: result.data.existing,
      generated: result.data.generated,
      skippedTemplates: result.data.skippedTemplates,
    },
    ok: true,
  };
}

export const generateRecurringTaskInstancesForDateContract =
  defineUseCaseContract<
    GenerateRecurringTaskInstancesForDateActionInput,
    GenerateRecurringTaskInstancesOutput
  >({
    affectedReadModels: ["tasks", "today", "calendar", "dashboard"],
    inputSchema: generateRecurringTaskInstancesForDateActionInputSchema,
    name: "generateRecurringTaskInstancesForDate",
    notes: [
      "Explicit user-triggered generation only.",
      "Generated instances set plannedDate and instanceDate to the target local date.",
      "scheduledStartAt remains null.",
    ],
    repositories: ["recurringTaskTemplates", "tasks"],
    transaction: "single_write",
  });

export const generateRecurringTaskInstancesForRangeContract =
  defineUseCaseContract<
    GenerateRecurringTaskInstancesForRangeActionInput,
    GenerateRecurringTaskInstancesOutput
  >({
    affectedReadModels: ["tasks", "today", "calendar", "dashboard"],
    inputSchema: generateRecurringTaskInstancesForRangeActionInputSchema,
    name: "generateRecurringTaskInstancesForRange",
    notes: [
      `Range generation is capped at ${maxGenerationRangeDays} days.`,
      "No background jobs or automatic page-load generation.",
    ],
    repositories: ["recurringTaskTemplates", "tasks"],
    transaction: "single_write",
  });
