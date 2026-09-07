import {
  getTableColumns,
  sql,
  type InferSelectModel,
  type Table,
} from "drizzle-orm";

// JSON projections keep the TypeScript column names and turn many related reads
// into one database round trip. Dates are restored at the boundary.
export function rowJson(table: Table) {
  return sql`jsonb_build_object(${sql.join(
    Object.entries(getTableColumns(table)).flatMap(([key, column]) => [
      sql`${key}::text`,
      sql`${column}`,
    ]),
    sql`, `,
  )})`;
}
export function hydrate<T extends Table>(
  table: T,
  rows: InferSelectModel<T>[],
): InferSelectModel<T>[] {
  const dates = Object.entries(getTableColumns(table))
    .filter(([, column]) => column.dataType === "date")
    .map(([key]) => key);
  for (const row of rows)
    for (const key of dates) {
      const record = row as Record<string, unknown>;
      if (record[key] != null) record[key] = new Date(record[key] as string);
    }
  return rows;
}
