import assert from "node:assert/strict"

import type { Personnel } from "@/entities/personnel/api/personnel"
import { personnelManagementApi } from "@/widgets/personnel-management/model/personnel-management-api"
import { usePersonnelManagementStore } from "@/widgets/personnel-management/model/use-personnel-management-store"

const originalApi = {
  createPersonnel: personnelManagementApi.createPersonnel,
  listPersonnel: personnelManagementApi.listPersonnel,
  updatePersonnel: personnelManagementApi.updatePersonnel,
}

function resetStore() {
  usePersonnelManagementStore.setState({
    dialogMode: "create",
    editingPersonnel: null,
    errorMessage: null,
    hasInitialized: false,
    isDialogOpen: false,
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
    name: "张三",
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
      makePersonnel({ id: 1 }),
      makePersonnel({ id: 2, name: "李四" }),
    ]

    personnelManagementApi.listPersonnel = async () => personnel

    await usePersonnelManagementStore.getState().initialize()

    const state = usePersonnelManagementStore.getState()
    assert.equal(state.hasInitialized, true)
    assert.deepEqual(state.personnel, personnel)
  })

  await runTest("createPersonnel closes dialog and refreshes list", async () => {
    const created = makePersonnel({
      bankName: "中国银行",
      gender: "女",
      id: 3,
      idCardNumber: "130000199901010001",
      name: "王五",
      nativePlace: "河北",
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

  await runTest("updatePersonnel closes dialog and refreshes list", async () => {
    const original = makePersonnel({
      bankName: "中国建设银行",
      gender: "女",
      id: 9,
      idCardNumber: "410000199001010001",
      name: "赵六",
      payrollCardNumber: "6222000000000001",
      phoneNumber: "13800000000",
    })
    const updated = makePersonnel({
      ...original,
      bankName: "中国银行",
      gender: "男",
      idCardNumber: "130000199201020002",
      name: "赵六更新",
      nativePlace: "河北",
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

  await runTest("updatePersonnel surfaces friendly duplicate id error", async () => {
    const original = makePersonnel({
      id: 9,
      idCardNumber: "410000199001010001",
      name: "赵六",
    })

    personnelManagementApi.updatePersonnel = async () => {
      throw new Error("身份证号码已存在")
    }

    usePersonnelManagementStore.getState().openEditDialog(original)
    const didUpdate = await usePersonnelManagementStore
      .getState()
      .updatePersonnelRecord(original.id, {
        idCardNumber: "130000199201020002",
        name: "赵六",
      })

    const state = usePersonnelManagementStore.getState()
    assert.equal(didUpdate, false)
    assert.equal(state.isDialogOpen, true)
    assert.equal(state.errorMessage, "身份证号码已存在")
  })
}

void main()
