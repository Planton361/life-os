import type { Metadata } from "next";
import {
  PageHeader,
  Pill,
  RoutePage,
  SectionPanel,
  accentStyle,
} from "@/components/layout/route-page-primitives";

const milestones = [
  {
    title: "Life OS dashboard interaction pass",
    date: "June",
    type: "Project milestone",
    accent: "var(--accent-blue)",
  },
  {
    title: "Masterarbeit literature structure ready",
    date: "July",
    type: "Education milestone",
    accent: "var(--accent-cyan)",
  },
  {
    title: "Running rhythm stabilized",
    date: "Q3",
    type: "Health milestone",
    accent: "var(--accent-red)",
  },
  {
    title: "Skill practice evidence collected",
    date: "Q4",
    type: "Skill milestone",
    accent: "var(--accent-purple)",
  },
] as const;

export const metadata: Metadata = {
  title: "Year Timeline | Life OS",
  description:
    "Prototype yearly roadmap and milestone target for dashboard Time Progress.",
};

export default function TimelinePage() {
  return (
    <RoutePage>
      <PageHeader
        eyebrow="Year roadmap"
        summary="A quiet milestone view for projects, goals, skills, and custom year markers. Static prototype only."
        title="Year Timeline"
      />

      <SectionPanel
        subtitle="Plan, completed, and custom milestones will live here later."
        title="2026 Milestones"
      >
        <ol className="space-y-3">
          {milestones.map((milestone) => (
            <li
              className="rounded-[13px] border border-[color-mix(in_srgb,var(--accent)_24%,transparent)] bg-[color-mix(in_srgb,var(--accent)_6%,#101827)] p-4"
              key={milestone.title}
              style={accentStyle(milestone.accent)}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-[var(--text-muted)]">
                    {milestone.date}
                  </p>
                  <h2 className="mt-1 text-base font-semibold text-[var(--text-primary)]">
                    {milestone.title}
                  </h2>
                </div>
                <Pill accent={milestone.accent}>{milestone.type}</Pill>
              </div>
            </li>
          ))}
        </ol>
      </SectionPanel>
    </RoutePage>
  );
}
