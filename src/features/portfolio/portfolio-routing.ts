import type {
  PortfolioScopeFilter,
  PortfolioSortMode,
  PortfolioView,
} from "./types";

type SearchSource = string | URLSearchParams | { toString(): string } | null;

type PortfolioHrefParams = {
  type?: PortfolioView | null;
  view?: PortfolioView | null;
  status?: string | null;
  area?: string | null;
  priority?: string | null;
  review?: string | null;
  selected?: string | null;
  scope?: PortfolioScopeFilter | null;
  sort?: PortfolioSortMode | null;
};

const portfolioViews: readonly PortfolioView[] = [
  "all",
  "tasks",
  "projects",
  "goals",
  "skills",
];

const portfolioScopeFilters: readonly PortfolioScopeFilter[] = [
  "all",
  "due_this_week",
  "in_progress",
  "blocked",
  "needs_decision",
  "review_open",
  "high_focus",
  "area_education",
  "area_work",
  "area_coding",
  "area_health",
];

const portfolioSortModes: readonly PortfolioSortMode[] = [
  "priority",
  "deadline",
  "recent",
];

function normalizeSearchParams(searchParams?: SearchSource) {
  return new URLSearchParams(searchParams?.toString() ?? "");
}

function setSearchParam(
  searchParams: URLSearchParams,
  key: string,
  value: string | null | undefined,
) {
  if (value === undefined) {
    return;
  }

  if (value === null || value === "") {
    searchParams.delete(key);
    return;
  }

  searchParams.set(key, value);
}

function isPortfolioView(value: string | null): value is PortfolioView {
  return portfolioViews.includes(value as PortfolioView);
}

function isPortfolioScopeFilter(
  value: string | null,
): value is PortfolioScopeFilter {
  return portfolioScopeFilters.includes(value as PortfolioScopeFilter);
}

function isPortfolioSortMode(value: string | null): value is PortfolioSortMode {
  return portfolioSortModes.includes(value as PortfolioSortMode);
}

export function normalizePortfolioView(value: string | null): PortfolioView {
  return isPortfolioView(value) ? value : "all";
}

export function normalizePortfolioScopeFilter(
  value: string | null,
): PortfolioScopeFilter {
  return isPortfolioScopeFilter(value) ? value : "all";
}

export function normalizePortfolioSortMode(
  value: string | null,
): PortfolioSortMode {
  return isPortfolioSortMode(value) ? value : "priority";
}

export function createPortfolioHref(
  params: PortfolioHrefParams,
  currentSearchParams?: SearchSource,
  pathname = "/portfolio",
): `/${string}` {
  const searchParams = normalizeSearchParams(currentSearchParams);

  setSearchParam(searchParams, "status", params.status);
  setSearchParam(searchParams, "type", params.type);
  setSearchParam(searchParams, "view", params.view);
  setSearchParam(searchParams, "area", params.area);
  setSearchParam(searchParams, "priority", params.priority);
  setSearchParam(searchParams, "review", params.review);
  setSearchParam(searchParams, "scope", params.scope);
  setSearchParam(searchParams, "sort", params.sort);
  setSearchParam(searchParams, "selected", params.selected);

  const query = searchParams.toString();

  return `${pathname}${query ? `?${query}` : ""}` as `/${string}`;
}
