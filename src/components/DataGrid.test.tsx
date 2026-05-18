import { describe, expect, it } from "vitest";
import type { DataGridColumn } from "./DataGrid";
import { sortDataGridRows } from "./DataGrid";

type Row = { name: string; minutes: number };

const rows: Row[] = [
  { name: "수학", minutes: 30 },
  { name: "영어", minutes: 10 },
  { name: "과학", minutes: 25 },
];

const numericColumn: DataGridColumn<Row> = {
  id: "minutes",
  title: "분",
  render: (row) => row.minutes,
  sortValue: (row) => row.minutes,
};

const textColumn: DataGridColumn<Row> = {
  id: "name",
  title: "과목",
  render: (row) => row.name,
  sortValue: (row) => row.name,
};

describe("sortDataGridRows", () => {
  it("sorts numeric columns ascending", () => {
    const result = sortDataGridRows(rows, numericColumn, "asc");
    expect(result.map((row) => row.minutes)).toEqual([10, 25, 30]);
  });

  it("sorts numeric columns descending", () => {
    const result = sortDataGridRows(rows, numericColumn, "desc");
    expect(result.map((row) => row.minutes)).toEqual([30, 25, 10]);
  });

  it("sorts text columns with Korean locale", () => {
    const result = sortDataGridRows(rows, textColumn, "asc");
    expect(result.map((row) => row.name)).toEqual(["과학", "수학", "영어"]);
  });

  it("returns a copy without reordering when the column has no sortValue", () => {
    const column: DataGridColumn<Row> = { id: "name", title: "과목", render: (row) => row.name };
    const result = sortDataGridRows(rows, column, "asc");
    expect(result).toEqual(rows);
    expect(result).not.toBe(rows);
  });

  it("does not mutate the input array", () => {
    const snapshot = [...rows];
    sortDataGridRows(rows, numericColumn, "desc");
    expect(rows).toEqual(snapshot);
  });
});
