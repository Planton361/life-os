import type { AreaSlug, Priority } from "@/types/life-os";

export interface DashboardHeroData {
  title: string;
  text: string;
  dayFocus: string;
  review: string;
  week: string;
}

export interface QuickAction {
  label: string;
  description: string;
  area: AreaSlug;
}

export interface CompactListItem {
  title: string;
  meta?: string[];
  label?: string;
  area?: AreaSlug;
  priority?: Priority;
}

export interface FocusItem {
  title: string;
  mode: string;
  duration: string;
  area: AreaSlug;
}

export interface ProgressItem {
  title: string;
  progress?: number;
  status?: string;
  area: AreaSlug;
}

export interface SnapshotData {
  title: string;
  description: string;
  area: AreaSlug;
  items: CompactListItem[];
}

export interface AreaNavigationItem {
  title: string;
  href: string;
  area: AreaSlug;
  summary: string;
}

export type WeekDotStatus = "done" | "planned" | "open";

export interface WeekDot {
  label: string;
  status: WeekDotStatus;
}

export interface DashboardData {
  hero: DashboardHeroData;
  quickActions: QuickAction[];
  today: CompactListItem[];
  inbox: CompactListItem[];
  week: CompactListItem[];
  focus: FocusItem[];
  projects: ProgressItem[];
  goals: CompactListItem[];
  review: CompactListItem[];
  snapshots: {
    health: SnapshotData;
    education: SnapshotData;
    workCoding: SnapshotData;
    nutrition: SnapshotData;
  };
  areaNavigation: AreaNavigationItem[];
  healthWeek: WeekDot[];
}
