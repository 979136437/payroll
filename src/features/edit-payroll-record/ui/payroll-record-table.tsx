import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  type RowData,
  useReactTable,
} from "@tanstack/react-table"
import { CircleDollarSign } from "lucide-react"
import { useMemo } from "react"

import type { PayrollRecord } from "@/entities/payroll-sheet/api/payroll-sheet"
import { cn } from "@/lib/utils"
import { maskSensitiveValue } from "@/shared/lib/formatters"

type PayrollRecordTableProps = {
  drafts: Record<number, string>
  onDraftChange: (recordId: number, value: string) => void
  onEditPersonnel: (personnelId: number) => void
  onSave: (record: PayrollRecord) => Promise<void>
  onToggleSelection: (personnelId: number) => void
  records: PayrollRecord[]
  savingRecordIdSet: ReadonlySet<number>
  selectedPersonnelIdSet: ReadonlySet<number>
}

type PayrollRecordTableMeta = {
  drafts: Record<number, string>
  onDraftChange: (recordId: number, value: string) => void
  onEditPersonnel: (personnelId: number) => void
  onSave: (record: PayrollRecord) => Promise<void>
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

const columns = [
  columnHelper.display({
    id: "select",
    header: () => <span>选择</span>,
    cell: ({ row, table }) => {
      const meta = table.options.meta?.payrollRecordTable

      if (!meta) {
        return null
      }

      return (
        <label className="flex justify-center">
          <input
            type="checkbox"
            checked={meta.selectedPersonnelIdSet.has(row.original.personnelId)}
            onChange={() => meta.onToggleSelection(row.original.personnelId)}
            className="size-4 cursor-pointer rounded border-input accent-primary focus:ring-2 focus:ring-ring"
          />
        </label>
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
          <p className="text-xs text-muted-foreground">
            人员编号 #{row.original.personnelId}
          </p>
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
        <label className="relative block">
          <input
            type="number"
            min="0"
            step="0.01"
            value={meta.drafts[record.recordId] ?? ""}
            disabled={isSaving}
            onChange={(event) =>
              meta.onDraftChange(record.recordId, event.target.value)
            }
            onBlur={() => void meta.onSave(record)}
            className="h-10 w-full cursor-text rounded-md border border-input bg-background px-3 pr-10 text-right text-sm outline-none transition focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-60"
          />
          <CircleDollarSign className="absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" />
        </label>
      )
    },
  }),
]

export function PayrollRecordTable({
  drafts,
  onDraftChange,
  onEditPersonnel,
  onSave,
  onToggleSelection,
  records,
  savingRecordIdSet,
  selectedPersonnelIdSet,
}: PayrollRecordTableProps) {
  const meta = useMemo(
    () => ({
      payrollRecordTable: {
        drafts,
        onDraftChange,
        onEditPersonnel,
        onSave,
        onToggleSelection,
        savingRecordIdSet,
        selectedPersonnelIdSet,
      },
    }),
    [
      drafts,
      onDraftChange,
      onEditPersonnel,
      onSave,
      onToggleSelection,
      savingRecordIdSet,
      selectedPersonnelIdSet,
    ],
  )

  const table = useReactTable({
    data: records,
    columns,
    getCoreRowModel: getCoreRowModel(),
    meta,
  })

  return (
    <div className="overflow-hidden rounded-2xl border border-border/80 bg-background shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
      <table className="min-w-full border-collapse">
        <thead className="bg-muted/70">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className="px-4 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground"
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody className="divide-y divide-border/80">
          {table.getRowModel().rows.map((row) => (
            <tr
              key={row.id}
              className={cn(
                "transition",
                selectedPersonnelIdSet.has(row.original.personnelId)
                  ? "bg-accent/40 hover:bg-accent/55"
                  : "bg-background hover:bg-accent/25",
              )}
            >
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="px-4 py-3.5 text-sm text-foreground">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
