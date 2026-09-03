export type SearchableResource = {
  archivedAt?: string;
  summary: string;
  title: string;
  type: string;
  url?: string;
};

function normalizedQuery(query: string) {
  return query.trim().toLocaleLowerCase();
}

/**
 * The active Library is a deterministic projection over canonical Resource
 * fields. Archived Resources remain addressable by an explicit detail URL,
 * but are deliberately absent from active search and selection results.
 */
export function searchActiveResources<T extends SearchableResource>(
  resources: readonly T[],
  query: string,
): T[] {
  const needle = normalizedQuery(query);

  return resources.filter((resource) => {
    if (resource.archivedAt) return false;
    if (!needle) return true;

    return [resource.title, resource.summary, resource.url, resource.type]
      .filter(Boolean)
      .some((value) => value?.toLocaleLowerCase().includes(needle));
  });
}
