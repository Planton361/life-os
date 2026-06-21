import type { Metadata } from "next";
import { DetailStubPage } from "@/components/layout/detail-stub-page";

export const metadata: Metadata = {
  title: "Workout Detail | Life OS",
};

export default async function WorkoutDetailPage({
  params,
}: Readonly<{
  params: Promise<{ workoutId: string }>;
}>) {
  const { workoutId } = await params;

  return (
    <DetailStubPage
      accent="var(--accent-red)"
      dataSource="workouts plus running_sessions, strength_sessions, health sync metadata, and recovery context."
      entityId={workoutId}
      entityLabel="Workout"
      summary="Minimal workout detail target for Running and Muscle dashboard links."
      title="Workout Detail"
    />
  );
}
