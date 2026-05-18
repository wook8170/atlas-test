import { useMemo, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";

export type DataGridSortDirection = "asc" | "desc";

export type DataGridColumn<Row> = {
  id: string;
  title: ReactNode;
  width?: number | string;
  align?: "left" | "center" | "right";
  render: (row: Row, rowIndex: number) => ReactNode;
  sortValue?: (row: Row) => string | number;
};

export type DataGridSortState = {
  columnId: string;
  direction: DataGridSortDirection;
};

export type DataGridProps<Row> = {
  columns: DataGridColumn<Row>[];
  rows: readonly Row[];
  getRowKey: (row: Row, index: number) => string | number;
  onRowSelect?: (row: Row, index: number) => void;
  selectedRowKey?: string | number | null;
  emptyMessage?: ReactNode;
  caption?: ReactNode;
  className?: string;
};

export function sortDataGridRows<Row>(
  rows: readonly Row[],
  column: DataGridColumn<Row> | undefined,
  direction: DataGridSortDirection,
): Row[] {
  const sortValue = column?.sortValue;
  if (!sortValue) {
    return [...rows];
  }

  const factor = direction === "asc" ? 1 : -1;
  return [...rows].sort((left, right) => {
    const leftValue = sortValue(left);
    const rightValue = sortValue(right);
    if (typeof leftValue === "number" && typeof rightValue === "number") {
      return (leftValue - rightValue) * factor;
    }
    return String(leftValue).localeCompare(String(rightValue), "ko-KR") * factor;
  });
}

function nextSortState(
  current: DataGridSortState | null,
  columnId: string,
): DataGridSortState | null {
  if (!current || current.columnId !== columnId) {
    return { columnId, direction: "asc" };
  }
  if (current.direction === "asc") {
    return { columnId, direction: "desc" };
  }
  return null;
}

export function DataGrid<Row>({
  columns,
  rows,
  getRowKey,
  onRowSelect,
  selectedRowKey,
  emptyMessage = "표시할 데이터가 없습니다.",
  caption,
  className,
}: DataGridProps<Row>) {
  const [sort, setSort] = useState<DataGridSortState | null>(null);

  const sortedRows = useMemo(() => {
    if (!sort) {
      return [...rows];
    }
    const column = columns.find((candidate) => candidate.id === sort.columnId);
    return sortDataGridRows(rows, column, sort.direction);
  }, [rows, columns, sort]);

  function handleRowActivate(row: Row, index: number) {
    onRowSelect?.(row, index);
  }

  function handleRowKeyDown(event: KeyboardEvent<HTMLTableRowElement>, row: Row, index: number) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleRowActivate(row, index);
    }
  }

  return (
    <div className={`data-grid-scroll${className ? ` ${className}` : ""}`}>
      <table className="data-grid">
        {caption ? <caption className="data-grid__caption">{caption}</caption> : null}
        <colgroup>
          {columns.map((column) => (
            <col key={column.id} style={column.width ? { width: column.width } : undefined} />
          ))}
        </colgroup>
        <thead>
          <tr>
            {columns.map((column) => {
              const sortable = Boolean(column.sortValue);
              const isSorted = sort?.columnId === column.id;
              const ariaSort = isSorted
                ? sort?.direction === "asc"
                  ? "ascending"
                  : "descending"
                : sortable
                  ? "none"
                  : undefined;

              return (
                <th
                  key={column.id}
                  scope="col"
                  aria-sort={ariaSort}
                  className={`data-grid__th data-grid__th--${column.align ?? "left"}`}
                >
                  {sortable ? (
                    <button
                      type="button"
                      className="data-grid__sort"
                      onClick={() => setSort((current) => nextSortState(current, column.id))}
                    >
                      <span>{column.title}</span>
                      <span aria-hidden="true" className="data-grid__sort-icon">
                        {isSorted ? (sort?.direction === "asc" ? "▲" : "▼") : "↕"}
                      </span>
                    </button>
                  ) : (
                    column.title
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sortedRows.length === 0 ? (
            <tr>
              <td className="data-grid__empty" colSpan={columns.length}>
                {emptyMessage}
              </td>
            </tr>
          ) : (
            sortedRows.map((row, index) => {
              const rowKey = getRowKey(row, index);
              const selectable = Boolean(onRowSelect);
              const isSelected = selectedRowKey != null && selectedRowKey === rowKey;

              return (
                <tr
                  key={rowKey}
                  className={`data-grid__row${isSelected ? " data-grid__row--selected" : ""}${
                    selectable ? " data-grid__row--selectable" : ""
                  }`}
                  aria-selected={selectable ? isSelected : undefined}
                  tabIndex={selectable ? 0 : undefined}
                  onClick={selectable ? () => handleRowActivate(row, index) : undefined}
                  onKeyDown={
                    selectable ? (event) => handleRowKeyDown(event, row, index) : undefined
                  }
                >
                  {columns.map((column) => (
                    <td
                      key={column.id}
                      className={`data-grid__td data-grid__td--${column.align ?? "left"}`}
                    >
                      {column.render(row, index)}
                    </td>
                  ))}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
