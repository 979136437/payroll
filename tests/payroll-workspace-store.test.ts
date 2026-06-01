import assert from "node:assert/strict"

import {
  createPersonnel,
  exportPersonnelExcel,
  importPersonnelExcel,
  listPersonnel,
  pickExcelExportPath,
  pickPersonnelImportFile,
} from "@/entities/personnel/api/personnel"
import {
  addPersonnelToSheet,
  createPayrollSheet,
  exportPayrollSheetExcel,
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
    currentView: "overview",
    editingPersonnel: null,
    errorMessage: null,
    hasInitialized: false,
    isAddingPersonnel: false,
    isBootstrapping: false,
    isCreateSheetOpen: false,
    isCreatingPersonnel: false,
    isCreatingSheet: false,
    isDeletingPersonnel: false,
    isDetailLoading: false,
    isExportingSheet: false,
    isPersonnelDialogOpen: false,
    isPersonnelEditDialogOpen: false,
    isRemovingPersonnel: false,
    isUpdatingPersonnel: false,
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
    exportPayrollSheetExcel,
    exportPersonnelExcel,
    getPayrollSheetDetail,
    importPersonnelExcel,
    listPayrollSheets,
    listPersonnel,
    pickExcelExportPath,
    pickPersonnelImportFile,
    removePersonnelFromSheet,
    updatePayrollRecordNetPay,
  })
}

function makePersonnel(overrides: Partial<Personnel> = {}): Personnel {
  return {
    bankName: null,
    ethnicity: null,
    gender: null,
    id: 1,
    idCardNumber: null,
    jobType: null,
    name: "Alex",
    nativePlace: null,
    payrollCardNumber: null,
    phoneNumber: null,
    ...overrides,
  }
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
  await runTest(
    "initializeWorkspace stays on overview while selecting latest sheet",
    async () => {
      const personnel: Personnel[] = [
        makePersonnel({
          gender: "男",
          id: 1,
          jobType: "mason",
          name: "Alex",
          phoneNumber: "13800000000",
        }),
      ]
      const sheets: PayrollSheetSummary[] = [
        { id: 8, name: "2026-06 Payroll", personnelCount: 1, updatedAt: "200" },
        { id: 7, name: "2026-05 Payroll", personnelCount: 0, updatedAt: "100" },
      ]
      const detail: PayrollSheetDetail = {
        records: [
          {
            jobType: "mason",
            name: "Alex",
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
      assert.equal(state.currentView, "overview")
      assert.equal(state.selectedSheetId, 8)
      assert.equal(state.sheetDetail?.records.length, 1)
      assert.equal(state.salaryDrafts[11], "0")
      assert.equal(state.hasInitialized, true)
    },
  )

  await runTest("openSheetDetail enters detail view and keeps selected sheet", async () => {
    const sheet: PayrollSheetSummary = {
      id: 8,
      name: "2026-06 Payroll",
      personnelCount: 1,
      updatedAt: "200",
    }

    payrollWorkspaceApi.listPersonnel = async () => []
    payrollWorkspaceApi.listPayrollSheets = async () => [sheet]
    payrollWorkspaceApi.getPayrollSheetDetail = async () => ({
      records: [],
      sheet,
    })

    await usePayrollWorkspaceStore.getState().initializeWorkspace()
    await usePayrollWorkspaceStore.getState().openSheetDetail(8)

    const state = usePayrollWorkspaceStore.getState()
    assert.equal(state.currentView, "sheet-detail")
    assert.equal(state.selectedSheetId, 8)
  })

  await runTest("showOverview keeps sheet context while leaving detail mode", async () => {
    usePayrollWorkspaceStore.setState({
      currentView: "sheet-detail",
      selectedSheetId: 8,
    })

    usePayrollWorkspaceStore.getState().showOverview()

    const state = usePayrollWorkspaceStore.getState()
    assert.equal(state.currentView, "overview")
    assert.equal(state.selectedSheetId, 8)
  })

  await runTest("createSheet selects created sheet and records success notice", async () => {
    const createdSheet: PayrollSheetSummary = {
      id: 12,
      name: "2026-07 Payroll",
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
    assert.equal(state.currentView, "sheet-detail")
    assert.equal(state.selectedSheetId, 12)
    assert.equal(state.isCreateSheetOpen, false)
    assert.equal(state.notice, "工资表已创建")
  })

  await runTest("createPersonnel keeps dialog context and records success notice", async () => {
    const created = makePersonnel({
      bankName: "Bank A",
      gender: "女",
      id: 2,
      idCardNumber: "410000199201010022",
      name: "Blair",
      nativePlace: "Henan",
      payrollCardNumber: "6222000000000002",
      phoneNumber: "13900000000",
    })

    payrollWorkspaceApi.createPersonnel = async () => created
    payrollWorkspaceApi.listPersonnel = async () => [created]

    usePayrollWorkspaceStore.getState().setPersonnelDialogOpen(true)
    const didCreate = await usePayrollWorkspaceStore
      .getState()
      .createPersonnelRecord({
        bankName: created.bankName,
        gender: created.gender,
        idCardNumber: created.idCardNumber,
        name: created.name,
        nativePlace: created.nativePlace,
        payrollCardNumber: created.payrollCardNumber,
        phoneNumber: created.phoneNumber,
      })

    const state = usePayrollWorkspaceStore.getState()
    assert.equal(didCreate, true)
    assert.deepEqual(state.personnel, [created])
    assert.deepEqual(state.pickerSelection, [2])
    assert.equal(state.isPersonnelDialogOpen, true)
    assert.equal(state.notice, "人员已新增到人员库")
  })

  await runTest("createPersonnel shows duplicate id card error", async () => {
    payrollWorkspaceApi.createPersonnel = async () => {
      throw new Error("duplicate id card")
    }
    payrollWorkspaceApi.listPersonnel = async () => []

    usePayrollWorkspaceStore.getState().setPersonnelDialogOpen(true)
    const didCreate = await usePayrollWorkspaceStore
      .getState()
      .createPersonnelRecord({
        idCardNumber: "410000199201010022",
        name: "Blair",
      })

    const state = usePayrollWorkspaceStore.getState()
    assert.equal(didCreate, false)
    assert.equal(state.isPersonnelDialogOpen, true)
    assert.equal(state.errorMessage, "duplicate id card")
    assert.equal(state.notice, null)
  })

  await runTest(
    "addSelectedPersonnelToSheet skips duplicates and records success notice",
    async () => {
      const personnel: Personnel[] = [
        makePersonnel({ id: 1, jobType: "mason", name: "Alex" }),
        makePersonnel({
          gender: "女",
          id: 2,
          name: "Blair",
          phoneNumber: "13900000000",
        }),
      ]
      const sheet: PayrollSheetSummary = {
        id: 20,
        name: "2026-08 Payroll",
        personnelCount: 2,
        updatedAt: "500",
      }
      const details: PayrollSheetDetail[] = [
        {
          records: [
            {
              jobType: "mason",
              name: "Alex",
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
              jobType: "mason",
              name: "Alex",
              netPay: 0,
              personnelId: 1,
              phoneNumber: null,
              recordId: 31,
            },
            {
              jobType: null,
              name: "Blair",
              netPay: 0,
              personnelId: 2,
              phoneNumber: "13900000000",
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
    "addSelectedPersonnelToSheet duplicate-only selection records duplicate notice",
    async () => {
      const personnel: Personnel[] = [makePersonnel({ id: 1, name: "Alex" })]
      const sheet: PayrollSheetSummary = {
        id: 21,
        name: "2026-08 Payroll",
        personnelCount: 1,
        updatedAt: "510",
      }
      const detail: PayrollSheetDetail = {
        records: [
          {
            jobType: null,
            name: "Alex",
            netPay: 0,
            personnelId: 1,
            phoneNumber: null,
            recordId: 33,
          },
        ],
        sheet,
      }

      payrollWorkspaceApi.listPersonnel = async () => personnel
      payrollWorkspaceApi.listPayrollSheets = async () => [sheet]
      payrollWorkspaceApi.getPayrollSheetDetail = async () => detail

      await usePayrollWorkspaceStore.getState().initializeWorkspace()
      usePayrollWorkspaceStore.getState().setPersonnelDialogOpen(true)
      usePayrollWorkspaceStore.getState().togglePickerSelection(1)
      await usePayrollWorkspaceStore.getState().addSelectedPersonnelToSheet()

      const state = usePayrollWorkspaceStore.getState()
      assert.equal(state.isPersonnelDialogOpen, false)
      assert.deepEqual(state.pickerSelection, [])
      assert.equal(state.notice, "所选人员已在当前工资表中")
    },
  )

  await runTest(
    "removeSelectedPersonnelFromSheet clears selection and records success notice",
    async () => {
      const sheet: PayrollSheetSummary = {
        id: 30,
        name: "2026-09 Payroll",
        personnelCount: 1,
        updatedAt: "600",
      }
      const details: PayrollSheetDetail[] = [
        {
          records: [
            {
              jobType: null,
              name: "Casey",
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

  await runTest("saveNetPay persists value and records success notice", async () => {
    const sheet: PayrollSheetSummary = {
      id: 40,
      name: "2026-10 Payroll",
      personnelCount: 1,
      updatedAt: "700",
    }
    const details: PayrollSheetDetail[] = [
      {
        records: [
          {
            jobType: null,
            name: "Dana",
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
            name: "Dana",
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
        name: "Dana",
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
    assert.equal(state.notice, "已保存 Dana 的工资")
    assert.deepEqual(state.savingRecordIds, [])
  })

  await runTest("saveNetPay rolls back draft when persistence fails", async () => {
    const sheet: PayrollSheetSummary = {
      id: 50,
      name: "2026-11 Payroll",
      personnelCount: 1,
      updatedAt: "800",
    }
    const detail: PayrollSheetDetail = {
      records: [
        {
          jobType: null,
          name: "Evan",
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
      throw new Error("save failed")
    }

    await usePayrollWorkspaceStore.getState().initializeWorkspace()
    const record = usePayrollWorkspaceStore.getState().sheetDetail!.records[0]
    usePayrollWorkspaceStore.getState().updateSalaryDraft(61, "2000")
    await usePayrollWorkspaceStore.getState().saveNetPay(record)

    const state = usePayrollWorkspaceStore.getState()
    assert.equal(state.salaryDrafts[61], "1500")
    assert.equal(state.errorMessage, "save failed")
    assert.deepEqual(state.savingRecordIds, [])
  })

  await runTest("exportCurrentSheet records exported path notice", async () => {
    const sheet: PayrollSheetSummary = {
      id: 60,
      name: "2026-12 Payroll",
      personnelCount: 1,
      updatedAt: "900",
    }

    payrollWorkspaceApi.pickExcelExportPath = async () =>
      "F:\\exports\\2026-12 Payroll.xlsx"
    payrollWorkspaceApi.exportPayrollSheetExcel = async () => ({
      filePath: "F:\\exports\\2026-12 Payroll.xlsx",
    })

    usePayrollWorkspaceStore.setState({
      selectedSheetId: sheet.id,
      sheetDetail: { records: [], sheet },
      sheets: [sheet],
    })

    const didExport = await usePayrollWorkspaceStore.getState().exportCurrentSheet()

    const state = usePayrollWorkspaceStore.getState()
    assert.equal(didExport, true)
    assert.equal(state.notice, "工资表已导出到 F:\\exports\\2026-12 Payroll.xlsx")
    assert.equal(state.isExportingSheet, false)
  })
}

void main()
