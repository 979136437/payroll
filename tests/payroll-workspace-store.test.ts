import assert from "node:assert/strict"

import {
  createPersonnel,
  listPersonnel,
} from "@/entities/personnel/api/personnel"
import {
  addPersonnelToSheet,
  createPayrollSheet,
  getPayrollSheetDetail,
  listPayrollSheets,
  removePersonnelFromSheet,
  updatePayrollRecordNetPay,
} from "@/entities/payroll-sheet/api/payroll-sheet"
import { payrollWorkspaceApi } from "@/widgets/payroll-workspace/model/workspace-api"
import { usePayrollWorkspaceStore } from "@/widgets/payroll-workspace/model/use-payroll-workspace-store"

type Personnel = Awaited<ReturnType<typeof listPersonnel>>[number]
type PayrollSheetSummary = Awaited<ReturnType<typeof listPayrollSheets>>[number]
type PayrollSheetDetail = NonNullable<
  Awaited<ReturnType<typeof getPayrollSheetDetail>>
>

function resetStore() {
  usePayrollWorkspaceStore.setState({
    errorMessage: null,
    hasInitialized: false,
    isAddingPersonnel: false,
    isBootstrapping: false,
    isCreateSheetOpen: false,
    isCreatingPersonnel: false,
    isCreatingSheet: false,
    isDetailLoading: false,
    isPersonnelDialogOpen: false,
    isRemovingPersonnel: false,
    notice: null,
    personnel: [],
    pickerSelection: [],
    salaryDrafts: {},
    savingRecordIds: [],
    selectedPersonnelIds: [],
    selectedSheetId: null,
    sheetDetail: null,
    sheets: [],
  })
}

function restoreMocks() {
  Object.assign(payrollWorkspaceApi, {
    addPersonnelToSheet,
    createPayrollSheet,
    createPersonnel,
    getPayrollSheetDetail,
    listPayrollSheets,
    listPersonnel,
    removePersonnelFromSheet,
    updatePayrollRecordNetPay,
  })
}

async function runTest(name: string, testFn: () => Promise<void> | void) {
  resetStore()
  restoreMocks()

  try {
    await testFn()
    process.stdout.write(`PASS ${name}\n`)
  } catch (error) {
    process.stderr.write(`FAIL ${name}\n`)
    throw error
  }
}

async function main() {
  await runTest("initializeWorkspace selects latest sheet", async () => {
    const personnel: Personnel[] = [
      { id: 1, jobType: "瓦工", name: "张三", phoneNumber: "13800000000" },
    ]
    const sheets: PayrollSheetSummary[] = [
      { id: 8, name: "2026 年 6 月工资表", personnelCount: 1, updatedAt: "200" },
      { id: 7, name: "2026 年 5 月工资表", personnelCount: 0, updatedAt: "100" },
    ]
    const detail: PayrollSheetDetail = {
      records: [
        {
          jobType: "瓦工",
          name: "张三",
          netPay: 0,
          personnelId: 1,
          phoneNumber: "13800000000",
          recordId: 11,
        },
      ],
      sheet: sheets[0],
    }

    payrollWorkspaceApi.listPersonnel = async () => personnel
    payrollWorkspaceApi.listPayrollSheets = async () => sheets
    payrollWorkspaceApi.getPayrollSheetDetail = async () => detail

    await usePayrollWorkspaceStore.getState().initializeWorkspace()

    const state = usePayrollWorkspaceStore.getState()
    assert.equal(state.selectedSheetId, 8)
    assert.equal(state.sheetDetail?.records.length, 1)
    assert.equal(state.salaryDrafts[11], "0")
    assert.equal(state.hasInitialized, true)
  })

  await runTest("createSheet selects created sheet and closes dialog", async () => {
    const createdSheet: PayrollSheetSummary = {
      id: 12,
      name: "2026 年 7 月工资表",
      personnelCount: 0,
      updatedAt: "300",
    }

    payrollWorkspaceApi.listPersonnel = async () => []
    payrollWorkspaceApi.createPayrollSheet = async () => createdSheet
    payrollWorkspaceApi.listPayrollSheets = async () => [createdSheet]
    payrollWorkspaceApi.getPayrollSheetDetail = async () => ({
      records: [],
      sheet: createdSheet,
    })

    usePayrollWorkspaceStore.getState().setCreateSheetOpen(true)
    const didCreate = await usePayrollWorkspaceStore.getState().createSheet({
      name: createdSheet.name,
      sourceSheetId: null,
    })

    const state = usePayrollWorkspaceStore.getState()
    assert.equal(didCreate, true)
    assert.equal(state.selectedSheetId, 12)
    assert.equal(state.isCreateSheetOpen, false)
    assert.equal(state.notice, "工资表已创建")
  })

  await runTest("createPersonnel keeps dialog context and selects new person", async () => {
    const created = {
      id: 2,
      jobType: "钢筋工",
      name: "李四",
      phoneNumber: "13900000000",
    }

    payrollWorkspaceApi.createPersonnel = async () => created
    payrollWorkspaceApi.listPersonnel = async () => [created]

    usePayrollWorkspaceStore.getState().setPersonnelDialogOpen(true)
    const didCreate = await usePayrollWorkspaceStore
      .getState()
      .createPersonnelRecord({
        jobType: created.jobType,
        name: created.name,
        phoneNumber: created.phoneNumber,
      })

    const state = usePayrollWorkspaceStore.getState()
    assert.equal(didCreate, true)
    assert.deepEqual(state.personnel, [created])
    assert.deepEqual(state.pickerSelection, [2])
    assert.equal(state.isPersonnelDialogOpen, true)
    assert.equal(state.notice, "人员已新增到人员库")
  })

  await runTest(
    "addSelectedPersonnelToSheet skips duplicates and refreshes detail",
    async () => {
      const personnel: Personnel[] = [
        { id: 1, jobType: "瓦工", name: "张三", phoneNumber: null },
        { id: 2, jobType: "木工", name: "李四", phoneNumber: null },
      ]
      const sheet: PayrollSheetSummary = {
        id: 20,
        name: "2026 年 8 月工资表",
        personnelCount: 2,
        updatedAt: "500",
      }
      const details: PayrollSheetDetail[] = [
        {
          records: [
            {
              jobType: "瓦工",
              name: "张三",
              netPay: 0,
              personnelId: 1,
              phoneNumber: null,
              recordId: 31,
            },
          ],
          sheet,
        },
        {
          records: [
            {
              jobType: "瓦工",
              name: "张三",
              netPay: 0,
              personnelId: 1,
              phoneNumber: null,
              recordId: 31,
            },
            {
              jobType: "木工",
              name: "李四",
              netPay: 0,
              personnelId: 2,
              phoneNumber: null,
              recordId: 32,
            },
          ],
          sheet,
        },
      ]
      const addedPayloads: number[][] = []
      let detailIndex = 0

      payrollWorkspaceApi.listPersonnel = async () => personnel
      payrollWorkspaceApi.listPayrollSheets = async () => [sheet]
      payrollWorkspaceApi.getPayrollSheetDetail = async () =>
        details[Math.min(detailIndex++, details.length - 1)]
      payrollWorkspaceApi.addPersonnelToSheet = async (_sheetId, personnelIds) => {
        addedPayloads.push(personnelIds)
      }

      await usePayrollWorkspaceStore.getState().initializeWorkspace()
      usePayrollWorkspaceStore.getState().setPersonnelDialogOpen(true)
      usePayrollWorkspaceStore.getState().togglePickerSelection(1)
      usePayrollWorkspaceStore.getState().togglePickerSelection(2)
      await usePayrollWorkspaceStore.getState().addSelectedPersonnelToSheet()

      const state = usePayrollWorkspaceStore.getState()
      assert.deepEqual(addedPayloads, [[2]])
      assert.equal(state.sheetDetail?.records.length, 2)
      assert.equal(state.isPersonnelDialogOpen, false)
      assert.equal(state.notice, "人员已加入当前工资表")
    },
  )

  await runTest(
    "removeSelectedPersonnelFromSheet clears selection after refresh",
    async () => {
      const sheet: PayrollSheetSummary = {
        id: 30,
        name: "2026 年 9 月工资表",
        personnelCount: 1,
        updatedAt: "600",
      }
      const details: PayrollSheetDetail[] = [
        {
          records: [
            {
              jobType: null,
              name: "王五",
              netPay: 1800,
              personnelId: 9,
              phoneNumber: null,
              recordId: 41,
            },
          ],
          sheet,
        },
        {
          records: [],
          sheet,
        },
      ]
      let detailIndex = 0
      const removedPayloads: number[][] = []

      payrollWorkspaceApi.listPersonnel = async () => []
      payrollWorkspaceApi.listPayrollSheets = async () => [sheet]
      payrollWorkspaceApi.getPayrollSheetDetail = async () =>
        details[Math.min(detailIndex++, details.length - 1)]
      payrollWorkspaceApi.removePersonnelFromSheet = async (
        _sheetId,
        personnelIds,
      ) => {
        removedPayloads.push(personnelIds)
      }

      await usePayrollWorkspaceStore.getState().initializeWorkspace()
      usePayrollWorkspaceStore.getState().toggleSelectedPersonnel(9)
      await usePayrollWorkspaceStore.getState().removeSelectedPersonnelFromSheet()

      const state = usePayrollWorkspaceStore.getState()
      assert.deepEqual(removedPayloads, [[9]])
      assert.deepEqual(state.selectedPersonnelIds, [])
      assert.equal(state.sheetDetail?.records.length, 0)
      assert.equal(state.notice, "已移除选中人员")
    },
  )

  await runTest("saveNetPay persists value and refreshes drafts", async () => {
    const sheet: PayrollSheetSummary = {
      id: 40,
      name: "2026 年 10 月工资表",
      personnelCount: 1,
      updatedAt: "700",
    }
    const details: PayrollSheetDetail[] = [
      {
        records: [
          {
            jobType: null,
            name: "赵六",
            netPay: 0,
            personnelId: 13,
            phoneNumber: null,
            recordId: 51,
          },
        ],
        sheet,
      },
      {
        records: [
          {
            jobType: null,
            name: "赵六",
            netPay: 2800,
            personnelId: 13,
            phoneNumber: null,
            recordId: 51,
          },
        ],
        sheet,
      },
    ]
    let detailIndex = 0
    const savedPayloads: Array<{ netPay: number; recordId: number }> = []

    payrollWorkspaceApi.listPersonnel = async () => []
    payrollWorkspaceApi.listPayrollSheets = async () => [sheet]
    payrollWorkspaceApi.getPayrollSheetDetail = async () =>
      details[Math.min(detailIndex++, details.length - 1)]
    payrollWorkspaceApi.updatePayrollRecordNetPay = async (recordId, netPay) => {
      savedPayloads.push({ netPay, recordId })
      return {
        jobType: null,
        name: "赵六",
        netPay,
        personnelId: 13,
        phoneNumber: null,
        recordId,
      }
    }

    await usePayrollWorkspaceStore.getState().initializeWorkspace()
    usePayrollWorkspaceStore.getState().updateSalaryDraft(51, "2800")
    await usePayrollWorkspaceStore
      .getState()
      .saveNetPay(usePayrollWorkspaceStore.getState().sheetDetail!.records[0])

    const state = usePayrollWorkspaceStore.getState()
    assert.deepEqual(savedPayloads, [{ netPay: 2800, recordId: 51 }])
    assert.equal(state.salaryDrafts[51], "2800")
    assert.equal(state.notice, "已保存 赵六 的工资")
    assert.deepEqual(state.savingRecordIds, [])
  })

  await runTest("saveNetPay rolls back draft when persistence fails", async () => {
    const sheet: PayrollSheetSummary = {
      id: 50,
      name: "2026 年 11 月工资表",
      personnelCount: 1,
      updatedAt: "800",
    }
    const detail: PayrollSheetDetail = {
      records: [
        {
          jobType: null,
          name: "孙七",
          netPay: 1500,
          personnelId: 18,
          phoneNumber: null,
          recordId: 61,
        },
      ],
      sheet,
    }

    payrollWorkspaceApi.listPersonnel = async () => []
    payrollWorkspaceApi.listPayrollSheets = async () => [sheet]
    payrollWorkspaceApi.getPayrollSheetDetail = async () => detail
    payrollWorkspaceApi.updatePayrollRecordNetPay = async () => {
      throw new Error("保存失败")
    }

    await usePayrollWorkspaceStore.getState().initializeWorkspace()
    const record = usePayrollWorkspaceStore.getState().sheetDetail!.records[0]
    usePayrollWorkspaceStore.getState().updateSalaryDraft(61, "2000")
    await usePayrollWorkspaceStore.getState().saveNetPay(record)

    const state = usePayrollWorkspaceStore.getState()
    assert.equal(state.salaryDrafts[61], "1500")
    assert.equal(state.errorMessage, "保存失败")
    assert.deepEqual(state.savingRecordIds, [])
  })
}

void main()
