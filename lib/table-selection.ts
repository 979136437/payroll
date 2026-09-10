import { functionalUpdate, type RowSelectionState, type Updater } from "@tanstack/react-table";

// 保留表格数据范围外的 ID，使人员翻页后仍能累计选择。
export function toRowSelection(ids: string[]): RowSelectionState {
  return Object.fromEntries(ids.map((id) => [id, true as const]));
}

export function updateSelectedIds(update: Updater<RowSelectionState>, current: RowSelectionState): string[] {
  return Object.entries(functionalUpdate(update, current))
    .filter(([, selected]) => selected)
    .map(([id]) => id);
}
