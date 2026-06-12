export type AreaSlug =
  | "education"
  | "work"
  | "coding"
  | "agent"
  | "health"
  | "nutrition"
  | "personal"
  | "review"
  | "system";

export type Priority = "P1" | "P2" | "P3" | "none";

export type ItemStatus = "open" | "planned" | "active" | "done" | "idea";

export type AppRoute =
  | "/dashboard"
  | "/today"
  | "/inbox"
  | "/week"
  | "/projects"
  | "/goals"
  | "/review"
  | "/education"
  | "/work"
  | "/coding"
  | "/health"
  | "/nutrition"
  | "/personal";

export interface NavItem {
  title: string;
  href: AppRoute;
  area: AreaSlug;
  description: string;
}

export interface PlaceholderPageConfig {
  title: string;
  description: string;
  future: string;
}
