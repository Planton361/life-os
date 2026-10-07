import type { SupabaseClientLike } from "../database.types";
import { readCanonicalProjectProjection, projectionColumns, projectionLimits, ProjectionReadError, type ProjectionTable, type SourceRow } from "../../runtime/project-export-projection";
export { projectExportInput, projectionLimits, ProjectionReadError, type ProjectProjectionSource } from "../../runtime/project-export-projection";
export async function readProjectProjection(client:SupabaseClientLike,userId:string,input:unknown) {
  let bytes = 0;
  async function read<T extends ProjectionTable>(
    table: T,
    filters: Record<string, string | string[]>,
  ): Promise<SourceRow<T>[]> {
    const rows: SourceRow<T>[] = [];
    const pageSize = 250;
    for (
      let start = 0;
      start <= projectionLimits.rowsPerQuery;
      start += pageSize
    ) {
      let q = client
        .from(table as ProjectionTable)
        .select(projectionColumns[table], { count: "exact" })
        .eq("user_id", userId);
      for (const [field, value] of Object.entries(filters))
        q = Array.isArray(value) ? q.in(field, value) : q.eq(field, value);
      if (table === "skill_evidence") q = q.is("withdrawn_at", null);
      const result = await q.order("id").range(start, start + pageSize - 1);
      if (result.error || result.count === null)
        throw new ProjectionReadError(
          "Project-Daten konnten nicht geladen werden.",
        );
      if (result.count > projectionLimits.rowsPerQuery)
        throw new ProjectionReadError(
          "Das Project überschreitet die Exportgrenze. Bitte verkleinere den Exportumfang.",
        );
      const page = (result.data ?? []) as unknown as SourceRow<T>[];
      bytes += Buffer.byteLength(JSON.stringify(page));
      if (bytes > projectionLimits.sourceBytes)
        throw new ProjectionReadError(
          "Das Project ist für ein Exportpaket zu groß.",
        );
      rows.push(...page);
      if (rows.length >= result.count) return rows;
      if (!page.length)
        throw new ProjectionReadError(
          "Project-Daten haben sich geändert. Bitte erneut exportieren.",
        );
    }
    throw new ProjectionReadError("Exportgrenze erreicht.");
  }
  return readCanonicalProjectProjection(read,input);
}
