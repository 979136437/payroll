import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  type PaginationState,
  type RowData,
  useReactTable,
} from "@tanstack/react-table"
import { CircleDollarSign, ListOrdered } from "lucide-react"
import { useMemo, useState } from "react"

import { Checkbox } from "@/components/ui/checkbox"
import type { PayrollRecord } from "@/entities/payroll-sheet/api/payroll-sheet"
import { cn } from "@/lib/utils"
import { maskSensitiveValue } from "@/shared/lib/formatters"
import { tableRowBackgroundClassName } from "@/shared/lib/table"
import { TablePaginationFooter } from "@/shared/ui/data-table"

type PayrollRecordTableProps = {
  drafts: Record<number, string>
  exportWeightDrafts: Record<number, string>
  onDraftChange: (recordId: number, value: string) => void
  onEditPersonnel: (personnelId: number) => void
  onExportWeightDraftChange: (recordId: number, value: string) => void
  onSave: (record: PayrollRecord) => Promise<void>
  onSaveExportWeight: (record: PayrollRecord) => Promise<void>
  onToggleSelection: (personnelId: number) => void
  records: PayrollRecord[]
  savingRecordIdSet: ReadonlySet<number>
  selectedPersonnelIdSet: ReadonlySet<number>
}

type PayrollRecordTableMeta = {
  drafts: Record<number, string>
  exportWeightDrafts: Record<number, string>
  onDraftChange: (recordId: number, value: string) => void
  onEditPersonnel: (personnelId: number) => void
  onExportWeightDraftChange: (recordId: number, value: string) => void
  onSave: (record: PayrollRecord) => Promise<void>
  onSaveExportWeight: (record: PayrollRecord) => Promise<void>
  onToggleSelection: (personnelId: number) => void
  savingRecordIdSet: ReadonlySet<number>
  selectedPersonnelIdSet: ReadonlySet<number>
}

declare module "@tanstack/react-table" {
  interface TableMeta<TData extends RowData> {
    payrollRecordTable?: PayrollRecordTableMeta
  }
}

const columnHelper = createColumnHelper<PayrollRecord>()

const cellInputClassName =
  "h-10 w-full cursor-text rounded-xl border border-input bg-background px-3 pr-10 text-right text-sm outline-none transition focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-60"

const columns = [
  columnHelper.display({
    id: "select",
    header: () => <span className="block text-center whitespace-nowrap">选择</span>,
    cell: ({ row, table }) => {
      const meta = table.options.meta?.payrollRecordTable

      if (!meta) {
        return null
      }

      return (
        <Checkbox
          aria-label={`选择 ${row.original.name}`}
          checked={meta.selectedPersonnelIdSet.has(row.original.personnelId)}
          onCheckedChange={() => meta.onToggleSelection(row.original.personnelId)}
        />
      )
    },
  }),
  columnHelper.accessor("name", {
    header: () => "姓名",
    cell: ({ row, getValue, table }) => {
      const meta = table.options.meta?.payrollRecordTable

      return (
        <button
          type="button"
          className="cursor-pointer space-y-1 rounded-sm text-left outline-none transition hover:text-primary focus-visible:ring-2 focus-visible:ring-ring/30"
          onClick={() => meta?.onEditPersonnel(row.original.personnelId)}
        >
          <p className="font-medium text-foreground">{getValue()}</p>
          <p className="text-xs text-muted-foreground">人员编号 #{row.original.personnelId}</p>
        </button>
      )
    },
  }),
  columnHelper.accessor("idCardNumber", {
    header: () => "身份证号码",
    cell: ({ getValue }) => maskSensitiveValue(getValue()),
  }),
  columnHelper.accessor("payrollCardNumber", {
    header: () => "工资卡号",
    cell: ({ getValue }) => maskSensitiveValue(getValue()),
  }),
  columnHelper.accessor("phoneNumber", {
    header: () => "电话",
    cell: ({ getValue }) => getValue() || "-",
  }),
  columnHelper.display({
    id: "netPay",
    header: () => "实发工资",
    cell: ({ row, table }) => {
      const meta = table.options.meta?.payrollRecordTable

      if (!meta) {
        return null
      }

      const record = row.original
      const isSaving = meta.savingRecordIdSet.has(record.recordId)

      return (
        <div className="w-full max-w-[12.5rem]">
          <label className="relative block">
            <input
              type="number"
              min="0"
              step="1"
              value={meta.drafts[record.recordId] ?? ""}
              disabled={isSaving}
              onChange={(event) =>
                meta.onDraftChange(record.recordId, event.target.value)
              }
              onBlur={() => void meta.onSave(record)}
              className={cn(cellInputClassName, isSaving && "bg-muted/30")}
            />
            <CircleDollarSign
              className={cn(
                "absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground",
                isSaving && "text-primary",
              )}
            />
          </label>
        </div>
      )
    },
  }),
  columnHelper.display({
    id: "exportWeight",
    header: () => "权重",
    cell: ({ row, table }) => {
      const meta = table.options.meta?.payrollRecordTable

      if (!meta) {
        return null
      }

      const record = row.original
      const isSaving = meta.savingRecordIdSet.has(record.recordId)

      return (
        <div className="w-full max-w-[6.25rem]">
          <label className="relative block">
            <input
              type="text"
              inputMode="numeric"
              value={meta.exportWeightDrafts[record.recordId] ?? ""}
              disabled={isSaving}
              onChange={(event) =>
                meta.onExportWeightDraftChange(record.recordId, event.target.value)
              }
              onBlur={() => void meta.onSaveExportWeight(record)}
              placeholder="可为空"
              className={cn(cellInputClassName, isSaving && "bg-muted/30")}
            />
            <ListOrdered
              className={cn(
                "absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground",
                isSaving && "text-primary",
              )}
            />
          </label>
        </div>
      )
    },
  }),
]

export function PayrollRecordTable({
  drafts,
  exportWeightDrafts,
  onDraftChange,
  onEditPersonnel,
  onExportWeightDraftChange,
  onSave,
  onSaveExportWeight,
  onToggleSelection,
  records,
  savingRecordIdSet,
  selectedPersonnelIdSet,
}: PayrollRecordTableProps) {
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })
  const meta = useMemo(
    () => ({
      payrollRecordTable: {
        drafts,
        exportWeightDrafts,
        onDraftChange,
        onEditPersonnel,
        onExportWeightDraftChange,
        onSave,
        onSaveExportWeight,
        onToggleSelection,
        savingRecordIdSet,
        selectedPersonnelIdSet,
      },
    }),
    [
      drafts,
      exportWeightDrafts,
      onDraftChange,
      onEditPersonnel,
      onExportWeightDraftChange,
      onSave,
      onSaveExportWeight,
      onToggleSelection,
      savingRecordIdSet,
      selectedPersonnelIdSet,
    ],
  )

  const table = useReactTable({
    data: records,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    meta,
    onPaginationChange: setPagination,
    state: {
      pagination,
    },
  })

  return (
    <div className="overflow-hidden rounded-2xl border border-border/80 bg-background shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
      <table className="min-w-full table-fixed border-collapse">
        <colgroup>
          <col className="w-14" />
          <col className="w-[5.75rem]" />
          <col className="w-[7rem]" />
          <col className="w-[7rem]" />
          <col className="w-[7rem]" />
          <col className="w-[14rem]" />
          <col className="w-[7rem]" />
        </colgroup>
        <thead className="bg-muted/60">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {table.getVisibleLeafColumns().map((column, index) => {
                const header = headerGroup.headers.find((item) => item.id === column.id)
                if (!header) {
                  return null
                }

                const isNumericInputColumn =
                  column.id === "exportWeight" || column.id === "netPay"
                const isSelectColumn = column.id === "select"

                return (
                  <th
                    key={header.id}
                    className={cn(
                      "px-4 py-3 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap",
                      isSelectColumn && "px-2 text-center",
                      isNumericInputColumn && "px-3",
                      index === 0 && "pl-4",
                    )}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </th>
                )
              })}
            </tr>
          ))}
        </thead>
        <tbody className="divide-y divide-border/80">
          {table.getRowModel().rows.map((row, index) => (
            <tr key={row.id} className="group transition-colors">
              {row.getVisibleCells().map((cell) => {
                const isSelectColumn = cell.column.id === "select"
                const isNumericInputColumn =
                  cell.column.id === "exportWeight" || cell.column.id === "netPay"

                return (
                  <td
                    key={cell.id}
                    className={cn(
                      "px-4 py-4 text-sm text-foreground align-middle",
                      isSelectColumn && "px-2",
                      isNumericInputColumn && "px-3",
                      tableRowBackgroundClassName(
                        selectedPersonnelIdSet.has(row.original.personnelId),
                        index,
                      ),
                    )}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <TablePaginationFooter
        onPageIndexChange={(nextIndex) => table.setPageIndex(nextIndex)}
        onPageSizeChange={(nextSize) => table.setPageSize(nextSize)}
        pageIndex={table.getState().pagination.pageIndex}
        pageSize={table.getState().pagination.pageSize}
        totalCount={records.length}
        totalPages={table.getPageCount() || 1}
      />
    </div>
  )
}
