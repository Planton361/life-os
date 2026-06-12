import type { Metadata } from "next";

import { AreaNavigation } from "@/components/dashboard/area-navigation";
import { CompactList } from "@/components/dashboard/compact-list";
import { DashboardCard } from "@/components/dashboard/dashboard-card";
import { DashboardHero } from "@/components/dashboard/dashboard-hero";
import { FocusList } from "@/components/dashboard/focus-list";
import { ProgressRow } from "@/components/dashboard/progress-row";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { SnapshotCard } from "@/components/dashboard/snapshot-card";
import { WeekDots } from "@/components/visualization/week-dots";
import { dashboardData } from "@/features/dashboard/mock-data";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default function DashboardPage() {
  return (
    <div className="space-y-3 md:space-y-4">
      <section className="grid items-start gap-3 lg:grid-cols-[minmax(0,1fr)_400px] xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="order-2 lg:order-1">
          <DashboardHero hero={dashboardData.hero} />
        </div>
        <div className="order-1 lg:order-2">
          <QuickActions actions={dashboardData.quickActions} />
        </div>
      </section>

      <DesktopDashboard />
      <MobileDashboard />
    </div>
  );
}

function DesktopDashboard() {
  return (
    <div className="hidden space-y-3 lg:block">
      <AreaNavigation items={dashboardData.areaNavigation} />

      <section
        className="grid items-start gap-3 lg:grid-cols-[minmax(0,1.14fr)_minmax(0,1fr)_minmax(0,1fr)]"
        aria-label="Dashboard Kern"
      >
        <TodayCard />
        <InboxCard />
        <WeekCard />
      </section>

      <section
        className="grid items-start gap-3 lg:grid-cols-3"
        aria-label="Fokus Projekte und Review"
      >
        <FocusCard />
        <ProjectsCard />
        <ReviewCard />
      </section>

      <section
        className="grid items-start gap-3 lg:grid-cols-3"
        aria-label="Area Snapshots"
      >
        <HealthCard />
        <EducationCard />
        <WorkCodingCard />
      </section>

      <section
        className="grid items-start gap-3 lg:grid-cols-3"
        aria-label="Ziele und Ernährung"
      >
        <GoalsCard />
        <NutritionCard />
      </section>
    </div>
  );
}

function MobileDashboard() {
  return (
    <section className="grid gap-4 lg:hidden" aria-label="Mobile Dashboard">
      <TodayCard />
      <InboxCard />
      <WeekCard />
      <FocusCard />
      <ProjectsCard />
      <ReviewCard />
      <HealthCard />
      <EducationCard />
      <WorkCodingCard />
      <GoalsCard />
      <NutritionCard />
    </section>
  );
}

function TodayCard() {
  return (
    <DashboardCard
      title="Heute"
      description="Konkrete nächste Schritte für den Tag."
      summary="3 offen · 115 min"
      emphasis="today"
      footerHref="/today"
      footerLabel="Today öffnen"
    >
      <CompactList items={dashboardData.today} variant="today" />
    </DashboardCard>
  );
}

function InboxCard() {
  return (
    <DashboardCard
      title="Inbox offen"
      description="Rohe Einträge, die noch geklärt werden müssen."
      count={dashboardData.inbox.length}
      footerHref="/inbox"
      footerLabel="Inbox öffnen"
    >
      <CompactList items={dashboardData.inbox} />
    </DashboardCard>
  );
}

function WeekCard() {
  return (
    <DashboardCard
      title="Diese Woche"
      description="Wichtige Bausteine für den Wochenrhythmus."
      count={dashboardData.week.length}
      footerHref="/week"
      footerLabel="Week öffnen"
    >
      <CompactList items={dashboardData.week} />
    </DashboardCard>
  );
}

function FocusCard() {
  return (
    <DashboardCard
      title="Fokus"
      description="Zeitblöcke mit klarer Arbeitsabsicht."
      count={dashboardData.focus.length}
    >
      <FocusList items={dashboardData.focus} />
    </DashboardCard>
  );
}

function ProjectsCard() {
  return (
    <DashboardCard
      title="Aktive Projekte"
      description="Fortschritt sparsam, aber handlungsnah."
      count={dashboardData.projects.length}
      footerHref="/projects"
      footerLabel="Projekte öffnen"
    >
      <div className="space-y-3">
        {dashboardData.projects.map((project) => (
          <ProgressRow key={project.title} item={project} />
        ))}
      </div>
    </DashboardCard>
  );
}

function GoalsCard() {
  return (
    <DashboardCard
      title="Zielrichtung"
      description="Quartalsziele als Richtung, nicht als Druck."
      count={dashboardData.goals.length}
      footerHref="/goals"
      footerLabel="Goals öffnen"
    >
      <CompactList items={dashboardData.goals} />
    </DashboardCard>
  );
}

function ReviewCard() {
  return (
    <DashboardCard
      title="Review"
      description="Offene Loops sichtbar halten."
      count={dashboardData.review.length}
      footerHref="/review"
      footerLabel="Review öffnen"
    >
      <CompactList items={dashboardData.review} />
    </DashboardCard>
  );
}

function HealthCard() {
  return (
    <SnapshotCard snapshot={dashboardData.snapshots.health}>
      <WeekDots
        days={dashboardData.healthWeek}
        summary="Training: 2 geplant. Status ist zusätzlich textlich markiert."
      />
    </SnapshotCard>
  );
}

function EducationCard() {
  return <SnapshotCard snapshot={dashboardData.snapshots.education} />;
}

function WorkCodingCard() {
  return <SnapshotCard snapshot={dashboardData.snapshots.workCoding} />;
}

function NutritionCard() {
  return <SnapshotCard snapshot={dashboardData.snapshots.nutrition} />;
}
