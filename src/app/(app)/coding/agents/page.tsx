import type { Metadata } from "next";
import { getAgentHubViewModel } from "@/features/profile-data";

export default async function AgentsPage() {
  const { AgentHubPage } =
    await import("@/features/coding/agents");
  const viewModel = await getAgentHubViewModel();

  return <AgentHubPage viewModel={viewModel} />;
}

export const metadata: Metadata = {
  title: "Agent Hub | Life OS",
  description:
    "Coding agent control hub for planning, assigning, monitoring and reviewing mock agent work.",
};
