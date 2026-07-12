import "server-only";

import type { ReviewKind, ReviewRecord } from "@/features/real-data";
import {
  createSupabaseProjectRepository,
  createSupabaseReviewRepository,
  createSupabaseTaskRepository,
} from "@/features/real-data/supabase";
import { createAuthenticatedSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentLifeOsProfileId } from "@/features/profile-data/profile-cookie";
import { reviewToday, reviewWeek } from "./review-period";

export type ReviewCarryTask = {
  id: string;
  title: string;
  meta: string;
  selected: boolean;
};

export type ReviewPageViewModel = {
  canWrite: boolean;
  kind: ReviewKind;
  periodStart: string;
  periodEnd: string;
  review: ReviewRecord | null;
  carryTasks: readonly ReviewCarryTask[];
  movement: {
    completedTasks: number;
    openTasks: number;
    activeProjects: number;
  };
  blockedReason?: string;
  profileId: "demo" | "empty" | "manual";
};

function emptyModel(kind: ReviewKind, profileId: "demo" | "empty" | "manual") {
  const today = reviewToday();
  const week = reviewWeek(today);
  return {
    canWrite: false,
    carryTasks: [],
    kind,
    movement: { activeProjects: 0, completedTasks: 0, openTasks: 0 },
    periodEnd: kind === "daily" ? today : week.end,
    periodStart: kind === "daily" ? today : week.start,
    profileId,
    review: null,
  } satisfies ReviewPageViewModel;
}

export async function getReviewPageViewModel(
  kind: ReviewKind,
): Promise<ReviewPageViewModel> {
  const profileId = await getCurrentLifeOsProfileId();
  const base = emptyModel(kind, profileId);

  if (profileId !== "manual") return base;

  const auth = await createAuthenticatedSupabaseServerClient();
  if (!auth.ok) {
    return {
      ...base,
      blockedReason:
        "Melde dich lokal mit Supabase an, um Reviews zu speichern.",
    };
  }

  const userId = auth.user.id;
  const reviewRepository = createSupabaseReviewRepository(auth.client);
  const [reviewResult, taskResult, projectResult] = await Promise.all([
    reviewRepository.getReviewByPeriod(userId, userId, kind, base.periodStart),
    createSupabaseTaskRepository(auth.client).getTasksByUser({
      profileId: userId,
      sortBy: "planned",
      userId,
    }),
    createSupabaseProjectRepository(auth.client).getProjectsByUser(
      userId,
      userId,
    ),
  ]);
  const review = reviewResult.ok ? reviewResult.data : null;
  const tasks = taskResult.ok ? taskResult.data : [];
  const projects = projectResult.ok ? projectResult.data : [];
  const decisions = review
    ? await reviewRepository.getTaskDecisions(userId, review.id)
    : { data: [], ok: true as const };
  const selectedIds = new Set(
    decisions.ok ? decisions.data.map((decision) => decision.taskId) : [],
  );
  const inPeriod = tasks.filter((task) => {
    const date = task.plannedDate ?? task.instanceDate;
    return Boolean(date && date >= base.periodStart && date <= base.periodEnd);
  });
  const carryTasks =
    kind === "daily"
      ? tasks
          .filter((task) => inPeriod.includes(task) || selectedIds.has(task.id))
          .filter(
            (task) => !["done", "canceled", "archived"].includes(task.status),
          )
          .map((task) => ({
            id: task.id,
            meta: `${task.priority} · ${task.durationMinutes ?? 30} min`,
            selected: selectedIds.has(task.id),
            title: task.title,
          }))
      : [];

  return {
    ...base,
    blockedReason:
      reviewResult.ok && taskResult.ok && projectResult.ok
        ? undefined
        : "Review-Daten konnten nicht vollständig geladen werden.",
    canWrite: reviewResult.ok && taskResult.ok && projectResult.ok,
    carryTasks,
    movement: {
      activeProjects: projects.filter((project) => project.status === "active")
        .length,
      completedTasks: inPeriod.filter((task) => task.status === "done").length,
      openTasks: inPeriod.filter(
        (task) => !["done", "canceled", "archived"].includes(task.status),
      ).length,
    },
    review,
  };
}
