import { useMemo } from "react"
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { CircleDollarSign } from "lucide-react"

import type { PayrollRecord } from "@/entities/payroll-sheet/api/payroll-sheet"

type PayrollRecordTableProps = {
  drafts: Record<number, string>
  onDraftChange: (recordId: number, value: string) => void
  onSave: (record: PayrollRecord) => Promise<void>
  onToggleSelection: (personnelId: number) => void
  records: PayrollRecord[]
  savingRecordIdSet: ReadonlySet<number>
  selectedPersonnelIdSet: ReadonlySet<number>
}

const columnHelper = createColumnHelper<PayrollRecord>()

export function PayrollRecordTable({
  drafts,
  onDraftChange,
  onSave,
  onToggleSelection,
  records,
  savingRecordIdSet,
  selectedPersonnelIdSet,
}: PayrollRecordTableProps) {
  const columns = useMemo(
    () => [
      columnHelper.display({
        id: "select",
        header: () => <span>选择</span>,
        cell: ({ row }) => (
          <label className="flex justify-center">
            <input
              type="checkbox"
              checked={selectedPersonnelIdSet.has(row.original.personnelId)}
              onChange={() => onToggleSelection(row.original.personnelId)}
              className="size-4 rounded border-border text-primary focus:ring-2 focus:ring-ring"
            />
          </label>
        ),
      }),
      columnHelper.accessor("name", {
        header: () => "姓名",
        cell: ({ row, getValue }) => (
          <div className="space-y-1">
            <p className="font-medium text-slate-950">{getValue()}</p>
            <p className="text-xs text-muted-foreground">
              人员编号 #{row.original.personnelId}
            </p>
          </div>
        ),
      }),
      columnHelper.accessor("jobType", {
        header: () => "工种",
        cell: ({ getValue }) => getValue() || "未填写",
      }),
      columnHelper.accessor("phoneNumber", {
        header: () => "电话",
        cell: ({ getValue }) => getValue() || "未填写",
      }),
      columnHelper.display({
        id: "netPay",
        header: () => "实发工资",
        cell: ({ row }) => {
          const record = row.original
          const isSaving = savingRecordIdSet.has(record.recordId)

          return (
            <label className="relative block">
              <input
                type="number"
                min="0"
                step="0.01"
                value={drafts[record.recordId] ?? ""}
                disabled={isSaving}
                onChange={(event) =>
                  onDraftChange(record.recordId, event.target.value)
                }
                onBlur={() => void onSave(record)}
                className="h-11 w-full rounded-2xl border border-border/70 bg-background/85 px-4 pr-10 text-right text-sm outline-none transition focus:border-primary/50 focus:ring-4 focus:ring-ring/40 disabled:opacity-60"
              />
              <CircleDollarSign className="absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" />
            </label>
          )
        },
      }),
    ],
    [
      drafts,
      onDraftChange,
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
  })

  return (
    <div className="overflow-hidden rounded-3xl border border-border/70 bg-white/75">
      <table className="min-w-full border-collapse">
        <thead className="bg-secondary/45">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-600"
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
        <tbody className="divide-y divide-border/60">
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="px-4 py-3 text-sm text-slate-700">
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
