import "server-only";
import type { TableRow } from "../supabase/database.types";
import type { WorkbenchData } from "../supabase/repositories/entity-workbench-read";
import type { readWeeklyPlanningContext } from "../supabase/repositories/weekly-planning-read";
import type { readTodayActivity } from "../supabase/repositories/supabase-today-activity-repository";
import type { Database } from "../supabase/database.types";

export type EntityCatalogOptions = Readonly<{
  ids?: readonly string[];
  activeOnly?: boolean;
  limit?: number;
}>;
export type ApplicationEntityCatalog = Readonly<{
  [K in "projects" | "goals" | "skills" | "tasks" | "resources" | "areas"]: (
    options?: EntityCatalogOptions,
  ) => Promise<{ data: readonly TableRow<K>[]; error: null }>;
}>;
export type ApplicationReadServices = Readonly<{
  catalog: ApplicationEntityCatalog;
  projectProjection(
    input: unknown,
  ): Promise<import("./project-export-projection").ProjectProjectionSource>;
  profileTimezone(): Promise<string>;
  workbench(allowUnavailableDependencies?: boolean): Promise<WorkbenchData>;
  weeklyPlanning(): ReturnType<typeof readWeeklyPlanningContext>;
  todayActivity(now?: Date): ReturnType<typeof readTodayActivity>;
  skillDevelopment(skillId: string): Promise<{
    data:
      | Database["public"]["Functions"]["skill_development_read"]["Returns"]
      | null;
    error: { message: string } | null;
  }>;
}>;
