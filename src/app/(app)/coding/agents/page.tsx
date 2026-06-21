import type { Metadata } from "next";
import { AgentHubPage, getAgentHubViewModel } from "@/features/coding/agents";

export default function AgentsPage() {
  const viewModel = getAgentHubViewModel();

  return <AgentHubPage viewModel={viewModel} />;
}

export const metadata: Metadata = {
  title: "Agent Hub | Life OS",
  description:
    "Coding agent control hub for planning, assigning, monitoring and reviewing mock agent work.",
};
