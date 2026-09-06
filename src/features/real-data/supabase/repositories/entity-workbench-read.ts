import "server-only";
import { createAuthenticatedSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentLifeOsProfileId } from "@/features/profile-data/profile-cookie";

export async function readEntityWorkbench() {
  if ((await getCurrentLifeOsProfileId()) !== "manual") return null;
  const auth = await createAuthenticatedSupabaseServerClient();
  if (!auth.ok) return null;
  const client = auth.client;
  const uid = auth.user.id;
  const [
    tasks,
    projects,
    goals,
    skills,
    resources,
    areas,
    taskSkills,
    relations,
    evidence,
    steps,
    scheduleSources,
    profile,
  ] = await Promise.all([
    client
      .from("tasks")
      .select("*")
      .eq("user_id", uid)
      .order("created_at", { ascending: false }),
    client
      .from("projects")
      .select("*")
      .eq("user_id", uid)
      .order("created_at", { ascending: false }),
    client
      .from("goals")
      .select("*")
      .eq("user_id", uid)
      .order("created_at", { ascending: false }),
    client
      .from("skills")
      .select("*")
      .eq("user_id", uid)
      .order("created_at", { ascending: false }),
    client
      .from("resources")
      .select("*")
      .eq("user_id", uid)
      .order("created_at", { ascending: false }),
    client.from("areas").select("id,name,archived_at").eq("user_id", uid),
    client.from("task_skill_links").select("*").eq("user_id", uid),
    client.from("resource_relations").select("*").eq("user_id", uid),
    client
      .from("skill_evidence")
      .select("*")
      .eq("user_id", uid)
      .order("evidence_date", { ascending: false }),
    client
      .from("task_steps")
      .select("*")
      .eq("user_id", uid)
      .order("position")
      .order("created_at")
      .order("id"),
    client
      .from("schedule_source_links")
      .select("task_id,source_type,source_id")
      .eq("user_id", uid),
    client.from("profiles").select("timezone").eq("id", uid).maybeSingle(),
  ]);
  if (
    [
      tasks,
      projects,
      goals,
      skills,
      resources,
      areas,
      taskSkills,
      relations,
      evidence,
      steps,
      scheduleSources,
    ].some((r) => r.error)
  )
    throw new Error("Entity-Daten konnten nicht geladen werden.");
  return {
    timezone: profile.data?.timezone ?? "Europe/Berlin",
    tasks: tasks.data ?? [],
    projects: projects.data ?? [],
    goals: goals.data ?? [],
    skills: skills.data ?? [],
    resources: resources.data ?? [],
    areas: areas.data ?? [],
    taskSkills: taskSkills.data ?? [],
    relations: relations.data ?? [],
    evidence: evidence.data ?? [],
    steps: steps.data ?? [],
    scheduleSources: scheduleSources.data ?? [],
  };
}
export type WorkbenchData = NonNullable<
  Awaited<ReturnType<typeof readEntityWorkbench>>
>;
