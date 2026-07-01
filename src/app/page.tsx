"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CreatePayrollSheetDialog } from "@/components/payroll/create-payroll-sheet-dialog";
import { PersonnelPickerDialog } from "@/components/payroll/personnel-picker-dialog";
import { PayrollRecordTable } from "@/components/payroll/payroll-record-table";
import { payrollApi } from "@/lib/api";
import type {
  PayrollSheetSummary,
  PayrollSheetDetail,
  PayrollSheetRecordRow,
} from "@/lib/types";
import { toast } from "sonner";
import {
  Plus,
  Download,
  UserPlus,
  Trash2,
  FileText,
  RefreshCw,
} from "lucide-react";

export default function HomePage() {
  const [sheets, setSheets] = useState<PayrollSheetSummary[]>([]);
  const [selectedSheetId, setSelectedSheetId] = useState<number | null>(null);
  const [sheetDetail, setSheetDetail] = useState<PayrollSheetDetail | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedRecordIds, setSelectedRecordIds] = useState<Set<number>>(
    new Set()
  );
  const [refreshing, setRefreshing] = useState(false);

  const loadSheets = async () => {
    try {
      const data = await payrollApi.list();
      setSheets(data);
      if (data.length > 0 && !selectedSheetId) {
        setSelectedSheetId(data[0].id);
      }
    } catch (error: any) {
      toast.error(error.message || "加载工资表列表失败");
    }
  };

  const loadSheetDetail = async (id: number) => {
    setLoading(true);
    try {
      const detail = await payrollApi.get(id);
      setSheetDetail(detail);
    } catch (error: any) {
      toast.error(error.message || "加载工资表失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initSheets = async () => {
      try {
        const data = await payrollApi.list();
        setSheets(data);
        if (data.length > 0) {
          setSelectedSheetId((currentId) => currentId ?? data[0].id);
        }
      } catch (error: any) {
        toast.error(error.message || "加载工资表列表失败");
      }
    };

    initSheets();
  }, []);

  useEffect(() => {
    if (selectedSheetId != null) {
      loadSheetDetail(selectedSheetId);
      setSelectedRecordIds(new Set());
    }
  }, [selectedSheetId]);

  const handleCreateSheet = async (name: string, sourceSheetId: number | null) => {
    try {
      const newSheet = await payrollApi.create({
        name,
        sourceSheetId,
      });
      toast.success("工资表创建成功");
      await loadSheets();
      setSelectedSheetId(newSheet.id);
    } catch (error: any) {
      throw error;
    }
  };

  const handleDeleteSheet = async () => {
    if (!selectedSheetId) return;
    try {
      await payrollApi.delete(selectedSheetId);
      toast.success("工资表已删除");
      setSelectedSheetId(null);
      setSheetDetail(null);
      await loadSheets();
    } catch (error: any) {
      toast.error(error.message || "删除失败");
    } finally {
      setDeleteDialogOpen(false);
    }
  };

  const handleAddPersonnel = async (params: {
    personnelIds: number[];
    defaultNetPay?: number;
    perPersonNetPay?: Record<number, number>;
  }) => {
    if (!selectedSheetId) return;
    try {
      await payrollApi.addPersonnel(
        selectedSheetId,
        params.personnelIds,
        {
          defaultNetPay: params.defaultNetPay,
          perPersonNetPay: params.perPersonNetPay,
        }
      );
      toast.success(`已添加 ${params.personnelIds.length} 人`);
      loadSheetDetail(selectedSheetId);
    } catch (error: any) {
      toast.error(error.message || "添加失败");
    }
  };

  const handleExport = () => {
    if (!selectedSheetId) return;
    window.open(payrollApi.exportExcel(selectedSheetId), "_blank");
  };

  const handleRefresh = async () => {
    if (!selectedSheetId) return;
    setRefreshing(true);
    try {
      await loadSheetDetail(selectedSheetId);
      toast.success("已刷新");
    } finally {
      setRefreshing(false);
    }
  };

  const records: PayrollSheetRecordRow[] = sheetDetail?.records || [];
  const existingPersonnelIds = records.map((r) => r.personnelId);

  const toggleRecordSelect = (id: number) => {
    const newSelected = new Set(selectedRecordIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedRecordIds(newSelected);
  };

  const toggleRecordSelectAll = () => {
    if (selectedRecordIds.size === records.length) {
      setSelectedRecordIds(new Set());
    } else {
      setSelectedRecordIds(new Set(records.map((r) => r.recordId)));
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <FileText className="size-6 text-primary shrink-0" />
              <div>
                <CardTitle>工资工作台</CardTitle>
                <CardDescription>管理工资表和工员工资</CardDescription>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="w-72">
                <Select
                  value={selectedSheetId ? String(selectedSheetId) : ""}
                  onValueChange={(v) => v && setSelectedSheetId(Number(v))}
                  disabled={sheets.length === 0}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="请选择工资表">
                      {selectedSheetId
                        ? sheets.find((s) => s.id === selectedSheetId)?.name
                        : null}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {sheets.map((sheet) => (
                      <SelectItem key={sheet.id} value={String(sheet.id)}>
                        {sheet.name} ({sheet.personnelCount}人)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={handleRefresh}
                disabled={!selectedSheetId || refreshing}
              >
                <RefreshCw
                  className={`size-4 ${refreshing ? "animate-spin" : ""}`}
                />
              </Button>
              <Button variant="outline" onClick={() => setCreateDialogOpen(true)}>
                <Plus className="size-4 mr-2" />
                新建工资表
              </Button>
              {selectedSheetId && (
                <Button
                  variant="outline"
                  className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  <Trash2 className="size-4 mr-2" />
                  删除工资表
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {sheets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <FileText className="size-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">暂无工资表</h3>
              <p className="text-muted-foreground mb-4">
                创建一个新的工资表开始管理工资
              </p>
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="size-4 mr-2" />
                新建工资表
              </Button>
            </div>
          ) : !selectedSheetId ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
              请选择一个工资表
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setPickerOpen(true)}>
                    <UserPlus className="size-4 mr-2" />
                    添加人员
                  </Button>
                </div>
                <Button variant="outline" size="sm" onClick={handleExport}>
                  <Download className="size-4 mr-2" />
                  导出 Excel
                </Button>
              </div>

              {loading ? (
                <div className="text-center py-8 text-muted-foreground">
                  加载中...
                </div>
              ) : (
                <PayrollRecordTable
                  records={records}
                  sheetId={selectedSheetId}
                  selectedRecordIds={selectedRecordIds}
                  onToggleSelect={toggleRecordSelect}
                  onToggleSelectAll={toggleRecordSelectAll}
                  onRefresh={() => selectedSheetId && loadSheetDetail(selectedSheetId)}
                />
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <CreatePayrollSheetDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        existingSheets={sheets}
        onCreate={handleCreateSheet}
      />

      <PersonnelPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        existingPersonnelIds={existingPersonnelIds}
        onConfirm={handleAddPersonnel}
        title="从人员库添加"
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除工资表</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除工资表 "{sheetDetail?.sheet.name || ""}" 吗？
              此操作将同时删除表内所有工资记录，且不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSheet}
              className="bg-destructive hover:bg-destructive/90"
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
