import assert from "node:assert/strict"

import type { Personnel } from "@/entities/personnel/api/personnel"
import { personnelManagementApi } from "@/widgets/personnel-management/model/personnel-management-api"
import { usePersonnelManagementStore } from "@/widgets/personnel-management/model/use-personnel-management-store"

const originalApi = {
  createPersonnel: personnelManagementApi.createPersonnel,
  deletePersonnel: personnelManagementApi.deletePersonnel,
  exportPersonnelExcel: personnelManagementApi.exportPersonnelExcel,
  importPersonnelExcel: personnelManagementApi.importPersonnelExcel,
  listPersonnel: personnelManagementApi.listPersonnel,
  pickExcelExportPath: personnelManagementApi.pickExcelExportPath,
  pickPersonnelImportFile: personnelManagementApi.pickPersonnelImportFile,
  updatePersonnel: personnelManagementApi.updatePersonnel,
}

function resetStore() {
  usePersonnelManagementStore.setState({
    dialogMode: "create",
    editingPersonnel: null,
    errorMessage: null,
    hasInitialized: false,
    isDeleting: false,
    isDialogOpen: false,
    isExporting: false,
    isImporting: false,
    isLoading: false,
    isSubmitting: false,
    notice: null,
    personnel: [],
    query: "",
  })
}

function restoreMocks() {
  Object.assign(personnelManagementApi, originalApi)
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
  await runTest("initialize loads personnel list once", async () => {
    const personnel = [
      makePersonnel({ id: 1, name: "Alex" }),
      makePersonnel({ id: 2, name: "Blair" }),
    ]

    personnelManagementApi.listPersonnel = async () => personnel

    await usePersonnelManagementStore.getState().initialize()

    const state = usePersonnelManagementStore.getState()
    assert.equal(state.hasInitialized, true)
    assert.deepEqual(state.personnel, personnel)
  })

  await runTest("createPersonnel closes dialog and records success notice", async () => {
    const created = makePersonnel({
      bankName: "Bank A",
      gender: "女",
      id: 3,
      idCardNumber: "130000199901010001",
      name: "Casey",
      nativePlace: "Hebei",
      payrollCardNumber: "6222000000000001",
      phoneNumber: "13900000000",
    })

    personnelManagementApi.createPersonnel = async () => created
    personnelManagementApi.listPersonnel = async () => [created]

    usePersonnelManagementStore.getState().openCreateDialog()
    const didCreate = await usePersonnelManagementStore
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

    const state = usePersonnelManagementStore.getState()
    assert.equal(didCreate, true)
    assert.equal(state.isDialogOpen, false)
    assert.equal(state.notice, "人员已新增到人员库")
    assert.deepEqual(state.personnel, [created])
  })

  await runTest("updatePersonnel closes dialog and records success notice", async () => {
    const original = makePersonnel({
      bankName: "Bank B",
      gender: "女",
      id: 9,
      idCardNumber: "410000199001010001",
      name: "Dana",
      payrollCardNumber: "6222000000000001",
      phoneNumber: "13800000000",
    })
    const updated = makePersonnel({
      ...original,
      bankName: "Bank C",
      gender: "男",
      idCardNumber: "130000199201020002",
      name: "Dana Updated",
      nativePlace: "Henan",
      phoneNumber: "13900000000",
    })

    personnelManagementApi.updatePersonnel = async () => updated
    personnelManagementApi.listPersonnel = async () => [updated]

    usePersonnelManagementStore.getState().openEditDialog(original)
    const didUpdate = await usePersonnelManagementStore
      .getState()
      .updatePersonnelRecord(original.id, {
        bankName: updated.bankName,
        gender: updated.gender,
        idCardNumber: updated.idCardNumber,
        name: updated.name,
        nativePlace: updated.nativePlace,
        payrollCardNumber: updated.payrollCardNumber,
        phoneNumber: updated.phoneNumber,
      })

    const state = usePersonnelManagementStore.getState()
    assert.equal(didUpdate, true)
    assert.equal(state.isDialogOpen, false)
    assert.equal(state.notice, "人员信息已更新")
    assert.deepEqual(state.personnel, [updated])
  })

  await runTest("deletePersonnel closes dialog and records success notice", async () => {
    const existing = makePersonnel({ id: 12, name: "Erin" })

    personnelManagementApi.deletePersonnel = async () => undefined
    personnelManagementApi.listPersonnel = async () => []

    usePersonnelManagementStore.setState({
      dialogMode: "edit",
      editingPersonnel: existing,
      isDialogOpen: true,
      personnel: [existing],
    })

    const didDelete = await usePersonnelManagementStore
      .getState()
      .deletePersonnelRecord(existing.id)

    const state = usePersonnelManagementStore.getState()
    assert.equal(didDelete, true)
    assert.equal(state.isDialogOpen, false)
    assert.equal(state.notice, "人员已删除")
    assert.deepEqual(state.personnel, [])
  })

  await runTest("updatePersonnel surfaces duplicate id error", async () => {
    const original = makePersonnel({
      id: 9,
      idCardNumber: "410000199001010001",
      name: "Frank",
    })

    personnelManagementApi.updatePersonnel = async () => {
      throw new Error("duplicate id card")
    }

    usePersonnelManagementStore.getState().openEditDialog(original)
    const didUpdate = await usePersonnelManagementStore
      .getState()
      .updatePersonnelRecord(original.id, {
        idCardNumber: "130000199201020002",
        name: "Frank",
      })

    const state = usePersonnelManagementStore.getState()
    assert.equal(didUpdate, false)
    assert.equal(state.isDialogOpen, true)
    assert.equal(state.errorMessage, "duplicate id card")
  })

  await runTest("importPersonnelFile refreshes list and records summary notice", async () => {
    const imported = makePersonnel({
      id: 20,
      idCardNumber: "430623197201192213",
      name: "Chen",
    })

    personnelManagementApi.pickPersonnelImportFile = async () => "F:\\imports\\roster.xlsx"
    personnelManagementApi.importPersonnelExcel = async () => ({
      createdCount: 1,
      errors: [],
      skippedCount: 0,
      updatedCount: 2,
    })
    personnelManagementApi.listPersonnel = async () => [imported]

    await usePersonnelManagementStore.getState().importPersonnelFile()

    const state = usePersonnelManagementStore.getState()
    assert.deepEqual(state.personnel, [imported])
    assert.equal(state.notice, "人员导入完成：新增 1，更新 2，跳过 0")
    assert.equal(state.isImporting, false)
  })

  await runTest("exportPersonnelFile records exported path notice", async () => {
    personnelManagementApi.pickExcelExportPath = async () => "F:\\exports\\人员花名册.xlsx"
    personnelManagementApi.exportPersonnelExcel = async () => ({
      filePath: "F:\\exports\\人员花名册.xlsx",
    })

    await usePersonnelManagementStore.getState().exportPersonnelFile()

    const state = usePersonnelManagementStore.getState()
    assert.equal(state.notice, "人员已导出到 F:\\exports\\人员花名册.xlsx")
    assert.equal(state.isExporting, false)
  })
}

void main()
