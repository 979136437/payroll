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
  deletePayrollSheet,
  exportPayrollSheetExcel,
  getPayrollSheetDetail,
  listPayrollSheets,
  removePersonnelFromSheet,
  updatePayrollRecordNetPay,
} from "@/entities/payroll-sheet/api/payroll-sheet"
import {
  markPersonnelDataChanged,
  resetPersonnelDataRevision,
} from "@/shared/model/personnel-data-revision"
import { payrollWorkspaceApi } from "@/widgets/payroll-workspace/model/workspace-api"
import { usePayrollWorkspaceStore } from "@/widgets/payroll-workspace/model/use-payroll-workspace-store"

type Personnel = Awaited<ReturnType<typeof listPersonnel>>[number]
type PayrollSheetSummary = Awaited<ReturnType<typeof listPayrollSheets>>[number]
type PayrollSheetDetail = NonNullable<
  Awaited<ReturnType<typeof getPayrollSheetDetail>>
>

function resetStore() {
  resetPersonnelDataRevision()
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
    isDeletingSheet: false,
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
    personnelDataRevisionSeen: 0,
  })
}

function restoreMocks() {
  Object.assign(payrollWorkspaceApi, {
    addPersonnelToSheet,
    createPayrollSheet,
    createPersonnel,
    deletePayrollSheet,
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
            bankName: null,
            deductionAmount: null,
            grossPay: null,
            idCardNumber: null,
            name: "Alex",
            netPay: 0,
            payeeSignature: null,
            payrollCardNumber: null,
            personnelId: 1,
            phoneNumber: "13800000000",
            recordId: 11,
            remark: null,
            wageStandard: null,
            attendanceDays: null,
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

  await runTest(
    "initializeWorkspace refreshes again when personnel data revision changes",
    async () => {
      const firstPersonnel: Personnel[] = [makePersonnel({ id: 1, name: "Alex" })]
      const secondPersonnel: Personnel[] = [makePersonnel({ id: 1, name: "Alex Updated" })]
      const sheet: PayrollSheetSummary = {
        id: 8,
        name: "2026-06 Payroll",
        personnelCount: 1,
        updatedAt: "200",
      }
      const firstDetail: PayrollSheetDetail = {
        records: [
          {
            attendanceDays: null,
            bankName: null,
            deductionAmount: null,
            grossPay: null,
            idCardNumber: null,
            name: "Alex",
            netPay: 0,
            payeeSignature: null,
            payrollCardNumber: null,
            personnelId: 1,
            phoneNumber: null,
            recordId: 11,
            remark: null,
            wageStandard: null,
          },
        ],
        sheet,
      }
      const secondDetail: PayrollSheetDetail = {
        records: [
          {
            attendanceDays: null,
            bankName: null,
            deductionAmount: null,
            grossPay: null,
            idCardNumber: null,
            name: "Alex Updated",
            netPay: 0,
            payeeSignature: null,
            payrollCardNumber: null,
            personnelId: 1,
            phoneNumber: null,
            recordId: 11,
            remark: null,
            wageStandard: null,
          },
        ],
        sheet,
      }
      let listPersonnelCalls = 0

      payrollWorkspaceApi.listPayrollSheets = async () => [sheet]
      payrollWorkspaceApi.listPersonnel = async () => {
        listPersonnelCalls += 1
        return listPersonnelCalls === 1 ? firstPersonnel : secondPersonnel
      }
      payrollWorkspaceApi.getPayrollSheetDetail = async () =>
        listPersonnelCalls === 1 ? firstDetail : secondDetail

      await usePayrollWorkspaceStore.getState().initializeWorkspace()
      markPersonnelDataChanged()
      await usePayrollWorkspaceStore.getState().initializeWorkspace()

      const state = usePayrollWorkspaceStore.getState()
      assert.equal(listPersonnelCalls, 2)
      assert.equal(state.personnel[0]?.name, "Alex Updated")
      assert.equal(state.sheetDetail?.records[0]?.name, "Alex Updated")
    },
  )

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

  await runTest("deletePayrollSheet selects next sheet when deleting current sheet", async () => {
    const firstSheet: PayrollSheetSummary = {
      id: 11,
      name: "2026-05 Payroll",
      personnelCount: 1,
      updatedAt: "100",
    }
    const secondSheet: PayrollSheetSummary = {
      id: 12,
      name: "2026-06 Payroll",
      personnelCount: 0,
      updatedAt: "200",
    }

    payrollWorkspaceApi.deletePayrollSheet = async () => ({ deleted: true })
    payrollWorkspaceApi.listPersonnel = async () => []
    payrollWorkspaceApi.listPayrollSheets = async () => [secondSheet]
    payrollWorkspaceApi.getPayrollSheetDetail = async () => ({
      records: [],
      sheet: secondSheet,
    })

    usePayrollWorkspaceStore.setState({
      currentView: "sheet-detail",
      selectedSheetId: firstSheet.id,
      sheetDetail: { records: [], sheet: firstSheet },
      sheets: [firstSheet, secondSheet],
    })

    const didDelete = await usePayrollWorkspaceStore
      .getState()
      .deletePayrollSheet(firstSheet.id)

    const state = usePayrollWorkspaceStore.getState()
    assert.equal(didDelete, true)
    assert.equal(state.selectedSheetId, secondSheet.id)
    assert.equal(state.currentView, "sheet-detail")
    assert.equal(state.notice, "工资表已删除")
  })

  await runTest("deletePayrollSheet falls back to overview when no sheets remain", async () => {
    const onlySheet: PayrollSheetSummary = {
      id: 21,
      name: "2026-07 Payroll",
      personnelCount: 0,
      updatedAt: "300",
    }

    payrollWorkspaceApi.deletePayrollSheet = async () => ({ deleted: true })
    payrollWorkspaceApi.listPersonnel = async () => []
    payrollWorkspaceApi.listPayrollSheets = async () => []
    payrollWorkspaceApi.getPayrollSheetDetail = async () => null

    usePayrollWorkspaceStore.setState({
      currentView: "sheet-detail",
      selectedSheetId: onlySheet.id,
      sheetDetail: { records: [], sheet: onlySheet },
      sheets: [onlySheet],
    })

    const didDelete = await usePayrollWorkspaceStore
      .getState()
      .deletePayrollSheet(onlySheet.id)

    const state = usePayrollWorkspaceStore.getState()
    assert.equal(didDelete, true)
    assert.equal(state.selectedSheetId, null)
    assert.equal(state.currentView, "overview")
    assert.equal(state.sheetDetail, null)
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
              attendanceDays: null,
              bankName: null,
              deductionAmount: null,
              grossPay: null,
              idCardNumber: null,
              name: "Alex",
              netPay: 0,
              payeeSignature: null,
              payrollCardNumber: null,
              personnelId: 1,
              phoneNumber: null,
              recordId: 31,
              remark: null,
              wageStandard: null,
            },
          ],
          sheet,
        },
        {
          records: [
            {
              attendanceDays: null,
              bankName: null,
              deductionAmount: null,
              grossPay: null,
              idCardNumber: null,
              name: "Alex",
              netPay: 0,
              payeeSignature: null,
              payrollCardNumber: null,
              personnelId: 1,
              phoneNumber: null,
              recordId: 31,
              remark: null,
              wageStandard: null,
            },
            {
              attendanceDays: null,
              bankName: null,
              deductionAmount: null,
              grossPay: null,
              idCardNumber: null,
              name: "Blair",
              netPay: 0,
              payeeSignature: null,
              payrollCardNumber: null,
              personnelId: 2,
              phoneNumber: "13900000000",
              recordId: 32,
              remark: null,
              wageStandard: null,
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
            attendanceDays: null,
            bankName: null,
            deductionAmount: null,
            grossPay: null,
            idCardNumber: null,
            name: "Alex",
            netPay: 0,
            payeeSignature: null,
            payrollCardNumber: null,
            personnelId: 1,
            phoneNumber: null,
            recordId: 33,
            remark: null,
            wageStandard: null,
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
    "togglePickerSelection selects all available personnel without disabled duplicates",
    async () => {
      const personnel: Personnel[] = [
        makePersonnel({ id: 1, name: "Alex" }),
        makePersonnel({ id: 2, name: "Blair" }),
        makePersonnel({ id: 3, name: "Casey" }),
      ]
      const sheet: PayrollSheetSummary = {
        id: 22,
        name: "2026-08 Payroll",
        personnelCount: 1,
        updatedAt: "511",
      }
      const detail: PayrollSheetDetail = {
        records: [
          {
            attendanceDays: null,
            bankName: null,
            deductionAmount: null,
            grossPay: null,
            idCardNumber: null,
            name: "Alex",
            netPay: 0,
            payeeSignature: null,
            payrollCardNumber: null,
            personnelId: 1,
            phoneNumber: null,
            recordId: 34,
            remark: null,
            wageStandard: null,
          },
        ],
        sheet,
      }

      payrollWorkspaceApi.listPersonnel = async () => personnel
      payrollWorkspaceApi.listPayrollSheets = async () => [sheet]
      payrollWorkspaceApi.getPayrollSheetDetail = async () => detail

      await usePayrollWorkspaceStore.getState().initializeWorkspace()
      usePayrollWorkspaceStore.getState().togglePickerSelection(2)
      usePayrollWorkspaceStore.getState().toggleAllPickerSelection()

      let state = usePayrollWorkspaceStore.getState()
      assert.deepEqual(state.pickerSelection, [2, 3])

      usePayrollWorkspaceStore.getState().toggleAllPickerSelection()

      state = usePayrollWorkspaceStore.getState()
      assert.deepEqual(state.pickerSelection, [])
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
              attendanceDays: null,
              bankName: null,
              deductionAmount: null,
              grossPay: null,
              idCardNumber: null,
              name: "Casey",
              netPay: 1800,
              payeeSignature: null,
              payrollCardNumber: null,
              personnelId: 9,
              phoneNumber: null,
              recordId: 41,
              remark: null,
              wageStandard: null,
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
            attendanceDays: null,
            bankName: null,
            deductionAmount: null,
            grossPay: null,
            idCardNumber: null,
            name: "Dana",
            netPay: 0,
            payeeSignature: null,
            payrollCardNumber: null,
            personnelId: 13,
            phoneNumber: null,
            recordId: 51,
            remark: null,
            wageStandard: null,
          },
        ],
        sheet,
      },
      {
        records: [
          {
            attendanceDays: null,
            bankName: null,
            deductionAmount: null,
            grossPay: null,
            idCardNumber: null,
            name: "Dana",
            netPay: 2800,
            payeeSignature: null,
            payrollCardNumber: null,
            personnelId: 13,
            phoneNumber: null,
            recordId: 51,
            remark: null,
            wageStandard: null,
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
        attendanceDays: null,
        bankName: null,
        deductionAmount: null,
        grossPay: null,
        idCardNumber: null,
        name: "Dana",
        netPay,
        payeeSignature: null,
        payrollCardNumber: null,
        personnelId: 13,
        phoneNumber: null,
        recordId,
        remark: null,
        wageStandard: null,
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
          attendanceDays: null,
          bankName: null,
          deductionAmount: null,
          grossPay: null,
          idCardNumber: null,
          name: "Evan",
          netPay: 1500,
          payeeSignature: null,
          payrollCardNumber: null,
          personnelId: 18,
          phoneNumber: null,
          recordId: 61,
          remark: null,
          wageStandard: null,
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
