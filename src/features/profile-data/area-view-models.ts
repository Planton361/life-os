import "server-only";

import { getChallengesViewModel as getDemoChallengesViewModel } from "@/features/challenges";
import { getCodingOverviewViewModel as getDemoCodingOverviewViewModel } from "@/features/coding";
import { getAgentHubViewModel as getDemoAgentHubViewModel } from "@/features/coding/agents";
import { getRepositoriesViewModel as getDemoRepositoriesViewModel } from "@/features/coding/repositories";
import { getSkillMapViewModel as getDemoSkillMapViewModel } from "@/features/coding/skill-map";
import {
  getEducationOverviewViewModel as getDemoEducationOverviewViewModel,
  getEducationWorkspaceViewModel as getDemoEducationWorkspaceViewModel,
  getLearningLogViewModel as getDemoLearningLogViewModel,
} from "@/features/education";
import { getHealthOverviewViewModel as getDemoHealthOverviewViewModel } from "@/features/health";
import { getHabitsAnalyticsViewModel as getDemoHabitsAnalyticsViewModel } from "@/features/health/habits/habits-view-model";
import { getRunningTrackerViewModel as getDemoRunningTrackerViewModel } from "@/features/health/running";
import { getStrengthTrackerViewModel as getDemoStrengthTrackerViewModel } from "@/features/health/strength-tracker";
import {
  getEntertainmentPageViewModel as getDemoEntertainmentPageViewModel,
  getInventoryPageViewModel as getDemoInventoryPageViewModel,
  getJournalPageViewModel as getDemoJournalPageViewModel,
  getLifeOverviewViewModel as getDemoLifeOverviewViewModel,
  getNotesPageViewModel as getDemoNotesPageViewModel,
} from "@/features/life";
import { getNutritionOverviewViewModel as getDemoNutritionOverviewViewModel } from "@/features/nutrition";
import { getGroceryViewModel as getDemoGroceryViewModel } from "@/features/nutrition/grocery";
import { getMealPlannerViewModel as getDemoMealPlannerViewModel } from "@/features/nutrition/meal-planner";
import { getRecipesViewModel as getDemoRecipesViewModel } from "@/features/nutrition/recipes";
import { getResourcesViewModel as getDemoResourcesViewModel } from "@/features/resources";
import { getShopViewModel as getDemoShopViewModel } from "@/features/shop";
import {
  getWorkLogViewModel as getDemoWorkLogViewModel,
  getWorkOverviewViewModel as getDemoWorkOverviewViewModel,
  getWorkWikiViewModel as getDemoWorkWikiViewModel,
} from "@/features/work";
import { getCurrentLifeOsProfileId } from "./profile-cookie";
import type { LifeOsProfileId } from "./types";

type PathPart = string | number;

const blockedDemoFragments = [
  "Steady",
  "5-minute self-check",
  "10-minute walk after deep work",
  "Mood Pattern",
  "Repair Routines",
  "Today Signal",
  "Today signal",
  "Literature source deadline",
  "Literature source deadline klären",
  "Calendar page implementieren",
  "Life OS App",
  "Masterarbeit",
  "Finanzinformatik",
  "Water",
  "Coffee",
  "Skyr",
  "Protein Bowl",
  "Agent Workflow",
  "Data model notes",
  "Hyperskill",
  "Data access setup question",
  "Article on calm dashboards",
] as const;

const structuralStringKeys = new Set([
  "accent",
  "area",
  "attention",
  "category",
  "color",
  "density",
  "difficulty",
  "energyLabel",
  "fieldId",
  "href",
  "icon",
  "id",
  "importance",
  "intent",
  "kind",
  "mode",
  "pageKind",
  "priority",
  "privacy",
  "privacyLevel",
  "readiness",
  "relevance",
  "relationType",
  "resourceStatus",
  "resourceType",
  "reviewState",
  "source",
  "state",
  "status",
  "thesisPotential",
  "tone",
  "type",
  "variant",
  "view",
  "visibility",
  "workType",
]);

const structuralStringArrayKeys = new Set([
  "signals",
]);

const structuralArrayKeys = new Set([
  "captureTypes",
  "filterOptions",
  "goalTypes",
  "mapScopes",
  "optionalInputs",
  "primaryActions",
  "profiles",
  "projectOptions",
  "providerOptions",
  "secondaryActions",
  "slots",
  "statusOptions",
  "summaryStats",
  "typeOptions",
  "viewOptions",
  "views",
  "days",
]);

const contentArrayKeys = new Set([
  "activity",
  "agentSessions",
  "aiSuggestions",
  "bars",
  "boundaries",
  "clusters",
  "connections",
  "context",
  "fields",
  "habits",
  "insights",
  "items",
  "learnings",
  "literature",
  "methodNotes",
  "moodDirections",
  "notes",
  "practiceQueue",
  "questions",
  "recentLearnings",
  "relations",
  "resources",
  "reviewQueue",
  "rows",
  "routines",
  "sessions",
  "signals",
  "skills",
  "tasks",
  "tracks",
  "trends",
  "week",
  "weeks",
]);

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function hasBlockedDemoFragment(value: string) {
  return blockedDemoFragments.some((fragment) => value.includes(fragment));
}

function isInsideArray(path: readonly PathPart[]) {
  return path.some((part) => typeof part === "number");
}

function keyFromPath(path: readonly PathPart[]) {
  const last = path[path.length - 1];
  return typeof last === "string" ? last : "";
}

function parentKeyFromPath(path: readonly PathPart[]) {
  for (let index = path.length - 2; index >= 0; index -= 1) {
    const part = path[index];

    if (typeof part === "string") {
      return part;
    }
  }

  return "";
}

function profileEmptyText(profileId: LifeOsProfileId, areaLabel: string) {
  const area = areaLabel.toLowerCase();

  if (area.includes("resource")) {
    return "Noch keine Ressourcen gespeichert.";
  }

  if (area.includes("health")) {
    return "Noch keine Gesundheitsdaten erfasst.";
  }

  if (area.includes("nutrition")) {
    return "Noch keine Mahlzeiten geplant.";
  }

  if (area.includes("coding")) {
    return "Noch keine Coding-Eintraege erfasst.";
  }

  if (area.includes("education")) {
    return "Noch keine Lerneintraege erfasst.";
  }

  if (area.includes("work")) {
    return "Noch keine Arbeitseintraege erfasst.";
  }

  return "Noch keine Eintraege.";
}

function shouldCollapseArray(
  value: readonly unknown[],
  path: readonly PathPart[],
) {
  if (value.length === 0) {
    return false;
  }

  const key = keyFromPath(path);
  const parentKey = parentKeyFromPath(path);

  if (
    structuralArrayKeys.has(key) ||
    structuralArrayKeys.has(parentKey)
  ) {
    return false;
  }

  if (contentArrayKeys.has(key)) {
    return true;
  }

  return value.every(
    (item) =>
      item &&
      typeof item === "object" &&
      "id" in item &&
      ("title" in item || "name" in item || "label" in item),
  );
}

function neutralString(
  value: string,
  path: readonly PathPart[],
  profileId: LifeOsProfileId,
  areaLabel: string,
) {
  const key = keyFromPath(path);
  const parentKey = parentKeyFromPath(path);

  if (
    value.startsWith("/") ||
    value.startsWith("var(") ||
    value.startsWith("#") ||
    structuralStringKeys.has(key) ||
    structuralStringArrayKeys.has(parentKey) ||
    key.endsWith("Id") ||
    key.endsWith("Kind") ||
    key.endsWith("State") ||
    key.endsWith("Status") ||
    key.endsWith("Type")
  ) {
    return value;
  }

  if (
    key === "date" ||
    key.toLowerCase().endsWith("_at") ||
    key.endsWith("At") ||
    key.endsWith("Date") ||
    key.includes("date")
  ) {
    return "2026-06-24";
  }

  if (key === "time" || key.endsWith("Time") || key.includes("time")) {
    return "00:00";
  }

  if (key === "value" || key.endsWith("Value")) {
    return "0";
  }

  if (key === "count" || key.endsWith("Count")) {
    return "0";
  }

  if (isInsideArray(path)) {
    if (key === "title" || key === "name" || key === "label") {
      return profileEmptyText(profileId, areaLabel);
    }

    return profileEmptyText(profileId, areaLabel);
  }

  if (hasBlockedDemoFragment(value)) {
    if (key === "title" || key === "label" || key === "name") {
      return "Local profile state";
    }

    return profileEmptyText(profileId, areaLabel);
  }

  return value;
}

function sanitizeAreaViewModel<T>(
  value: T,
  profileId: LifeOsProfileId,
  areaLabel: string,
  path: readonly PathPart[] = [],
): T {
  if (Array.isArray(value)) {
    if (shouldCollapseArray(value, path)) {
      return [] as T;
    }

    return value.map((item, index) =>
      sanitizeAreaViewModel(item, profileId, areaLabel, [...path, index]),
    ) as T;
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [
        key,
        sanitizeAreaViewModel(entry, profileId, areaLabel, [...path, key]),
      ]),
    ) as T;
  }

  if (typeof value === "string") {
    return neutralString(value, path, profileId, areaLabel) as T;
  }

  if (typeof value === "number") {
    const key = keyFromPath(path);

    if (key.toLowerCase().includes("target")) {
      return 1 as T;
    }

    return 0 as T;
  }

  return value;
}

async function getProfileAreaViewModel<T>(
  getDemoViewModel: () => T,
  areaLabel: string,
): Promise<T> {
  const profileId = await getCurrentLifeOsProfileId();
  const viewModel = getDemoViewModel();

  if (profileId === "demo") {
    return viewModel;
  }

  return sanitizeAreaViewModel(clone(viewModel), profileId, areaLabel);
}

export function getProfileEmptyStateText(
  profileId: LifeOsProfileId,
  areaLabel: string,
) {
  return profileEmptyText(profileId, areaLabel);
}

export function getBlockedDemoFragments() {
  return [...blockedDemoFragments];
}

export async function getHealthOverviewViewModel(): Promise<
  ReturnType<typeof getDemoHealthOverviewViewModel>
> {
  return getProfileAreaViewModel(
    getDemoHealthOverviewViewModel,
    "Health & Fitness",
  );
}

export async function getHabitsAnalyticsViewModel(): Promise<
  ReturnType<typeof getDemoHabitsAnalyticsViewModel>
> {
  return getProfileAreaViewModel(
    getDemoHabitsAnalyticsViewModel,
    "Health & Fitness",
  );
}

export async function getRunningTrackerViewModel(): Promise<
  ReturnType<typeof getDemoRunningTrackerViewModel>
> {
  return getProfileAreaViewModel(
    getDemoRunningTrackerViewModel,
    "Health & Fitness",
  );
}

export async function getStrengthTrackerViewModel(): Promise<
  ReturnType<typeof getDemoStrengthTrackerViewModel>
> {
  return getProfileAreaViewModel(
    getDemoStrengthTrackerViewModel,
    "Health & Fitness",
  );
}

export async function getNutritionOverviewViewModel(): Promise<
  ReturnType<typeof getDemoNutritionOverviewViewModel>
> {
  return getProfileAreaViewModel(getDemoNutritionOverviewViewModel, "Nutrition");
}

export async function getMealPlannerViewModel(): Promise<
  ReturnType<typeof getDemoMealPlannerViewModel>
> {
  return getProfileAreaViewModel(getDemoMealPlannerViewModel, "Nutrition");
}

export async function getRecipesViewModel(): Promise<
  ReturnType<typeof getDemoRecipesViewModel>
> {
  return getProfileAreaViewModel(getDemoRecipesViewModel, "Nutrition");
}

export async function getGroceryViewModel(): Promise<
  ReturnType<typeof getDemoGroceryViewModel>
> {
  return getProfileAreaViewModel(getDemoGroceryViewModel, "Nutrition");
}

export async function getCodingOverviewViewModel(): Promise<
  ReturnType<typeof getDemoCodingOverviewViewModel>
> {
  return getProfileAreaViewModel(getDemoCodingOverviewViewModel, "Coding");
}

export async function getRepositoriesViewModel(): Promise<
  ReturnType<typeof getDemoRepositoriesViewModel>
> {
  return getProfileAreaViewModel(getDemoRepositoriesViewModel, "Coding");
}

export async function getAgentHubViewModel(): Promise<
  ReturnType<typeof getDemoAgentHubViewModel>
> {
  return getProfileAreaViewModel(getDemoAgentHubViewModel, "Coding");
}

export async function getSkillMapViewModel(): Promise<
  ReturnType<typeof getDemoSkillMapViewModel>
> {
  return getProfileAreaViewModel(getDemoSkillMapViewModel, "Coding");
}

export async function getLifeOverviewViewModel(): Promise<
  ReturnType<typeof getDemoLifeOverviewViewModel>
> {
  return getProfileAreaViewModel(getDemoLifeOverviewViewModel, "Life");
}

export async function getJournalPageViewModel(): Promise<
  ReturnType<typeof getDemoJournalPageViewModel>
> {
  return getProfileAreaViewModel(getDemoJournalPageViewModel, "Life");
}

export async function getNotesPageViewModel(): Promise<
  ReturnType<typeof getDemoNotesPageViewModel>
> {
  return getProfileAreaViewModel(getDemoNotesPageViewModel, "Life");
}

export async function getEntertainmentPageViewModel(): Promise<
  ReturnType<typeof getDemoEntertainmentPageViewModel>
> {
  return getProfileAreaViewModel(getDemoEntertainmentPageViewModel, "Life");
}

export async function getInventoryPageViewModel(): Promise<
  ReturnType<typeof getDemoInventoryPageViewModel>
> {
  return getProfileAreaViewModel(getDemoInventoryPageViewModel, "Life");
}

export async function getEducationOverviewViewModel(): Promise<
  ReturnType<typeof getDemoEducationOverviewViewModel>
> {
  return getProfileAreaViewModel(getDemoEducationOverviewViewModel, "Education");
}

export async function getEducationWorkspaceViewModel(): Promise<
  ReturnType<typeof getDemoEducationWorkspaceViewModel>
> {
  return getProfileAreaViewModel(
    getDemoEducationWorkspaceViewModel,
    "Education",
  );
}

export async function getLearningLogViewModel(): Promise<
  ReturnType<typeof getDemoLearningLogViewModel>
> {
  return getProfileAreaViewModel(getDemoLearningLogViewModel, "Education");
}

export async function getWorkOverviewViewModel(): Promise<
  ReturnType<typeof getDemoWorkOverviewViewModel>
> {
  return getProfileAreaViewModel(getDemoWorkOverviewViewModel, "Work");
}

export async function getWorkLogViewModel(): Promise<
  ReturnType<typeof getDemoWorkLogViewModel>
> {
  return getProfileAreaViewModel(getDemoWorkLogViewModel, "Work");
}

export async function getWorkWikiViewModel(): Promise<
  ReturnType<typeof getDemoWorkWikiViewModel>
> {
  return getProfileAreaViewModel(getDemoWorkWikiViewModel, "Work");
}

export async function getResourcesViewModel(): Promise<
  ReturnType<typeof getDemoResourcesViewModel>
> {
  return getProfileAreaViewModel(getDemoResourcesViewModel, "Resources");
}

export async function getShopViewModel(): Promise<
  ReturnType<typeof getDemoShopViewModel>
> {
  return getProfileAreaViewModel(getDemoShopViewModel, "Shop");
}

export async function getChallengesViewModel(): Promise<
  ReturnType<typeof getDemoChallengesViewModel>
> {
  return getProfileAreaViewModel(getDemoChallengesViewModel, "Challenges");
}
