<script setup lang="ts">
import { usePayrollStore } from '~/stores/payroll'
import { usePersonnelStore } from '~/stores/personnel'
import PayrollSheetList from '~/components/payroll/PayrollSheetList.vue'
import PayrollRecordTable from '~/components/payroll/PayrollRecordTable.vue'
import PersonnelPickerDialog from '~/components/payroll/PersonnelPickerDialog.vue'
import type { PayrollSheetRecordRow, Personnel, PayrollSheetSummary } from '~/types'

const payrollStore = usePayrollStore()
const personnelStore = usePersonnelStore()

const newSheetName = ref('')
const selectedPersonnelIds = ref<number[]>([])

onMounted(async () => {
  await Promise.all([
    payrollStore.fetchSheets(),
    personnelStore.fetchPersonnel(),
  ])
})

const formatCurrency = (value: number): string => {
  return value.toFixed(2)
}

const handleSelectSheet = (id: number) => {
  payrollStore.selectSheet(id)
}

const handleCreateSheet = () => {
  payrollStore.openCreateDialog()
  newSheetName.value = ''
}

const confirmCreateSheet = async () => {
  if (!newSheetName.value.trim()) {
    alert('请输入工资表名称')
    return
  }
  try {
    const created = await payrollStore.createSheet(newSheetName.value.trim())
    payrollStore.closeCreateDialog()
    payrollStore.selectSheet(created.id)
  } catch (err: any) {
    alert(`创建失败: ${err.message || '未知错误'}`)
  }
}

const handleDeleteIntent = (sheet: PayrollSheetSummary) => {
  payrollStore.openDeleteConfirm(sheet)
}

const confirmDeleteSheet = async () => {
  if (!payrollStore.pendingDeleteSheet) return
  try {
    await payrollStore.deleteSheet(payrollStore.pendingDeleteSheet.id)
    payrollStore.closeDeleteConfirm()
  } catch (err: any) {
    alert(`删除失败: ${err.message || '未知错误'}`)
  }
}

const handleAddPersonnel = () => {
  if (!payrollStore.currentSheetId) return
  selectedPersonnelIds.value = []
  payrollStore.openPersonnelPicker()
}

const handleSelectionChange = (ids: number[]) => {
  selectedPersonnelIds.value = ids
}

const handleConfirmAddPersonnel = async (payload: { netPay?: number }) => {
  if (selectedPersonnelIds.value.length === 0) return
  try {
    await payrollStore.addPersonnelToSheet(selectedPersonnelIds.value, payload.netPay)
    payrollStore.closePersonnelPicker()
    selectedPersonnelIds.value = []
  } catch (err: any) {
    alert(`添加失败: ${err.message || '未知错误'}`)
  }
}

const handleUpdateNetPay = async (recordId: number, netPay: number) => {
  try {
    await payrollStore.updateRecordNetPay(recordId, netPay)
  } catch (err: any) {
    alert(`更新失败: ${err.message || '未知错误'}`)
  }
}

const handleUpdateExportWeight = async (recordId: number, exportWeight: number | null) => {
  try {
    await payrollStore.updateRecordExportWeight(recordId, exportWeight)
  } catch (err: any) {
    alert(`更新失败: ${err.message || '未知错误'}`)
  }
}

const handleRemovePersonnel = async (personnelId: number) => {
  if (!confirm('确定要从工资表中移除此人员吗？')) return
  try {
    await payrollStore.removePersonnelFromSheet([personnelId])
  } catch (err: any) {
    alert(`移除失败: ${err.message || '未知错误'}`)
  }
}

const handleExport = async () => {
  if (!payrollStore.currentSheetId) return
  try {
    await payrollStore.exportSheet(payrollStore.currentSheetId)
  } catch (err: any) {
    alert(`导出失败: ${err.message || '未知错误'}`)
  }
}

const isMutating = computed(() => {
  return (
    payrollStore.loading ||
    payrollStore.detailLoading ||
    payrollStore.isCreating ||
    payrollStore.isAddingPersonnel ||
    payrollStore.isDeleting
  )
})

const availablePersonnel = computed(() => {
  if (!payrollStore.currentDetail) return personnelStore.personnel
  const currentIds = new Set(
    payrollStore.currentDetail.records.map((r: PayrollSheetRecordRow) => r.personnelId),
  )
  return personnelStore.personnel.filter((p: Personnel) => !currentIds.has(p.id))
})
</script>

<template>
  <div class="h-screen flex flex-col bg-gray-50">
    <div class="flex-1 flex overflow-hidden">
      <div class="w-72 flex-shrink-0">
        <PayrollSheetList
          :sheets="payrollStore.sheets"
          :current-sheet-id="payrollStore.currentSheetId"
          :loading="payrollStore.loading"
          @select="handleSelectSheet"
          @create="handleCreateSheet"
          @delete-intent="handleDeleteIntent"
        />
      </div>

      <div class="flex-1 flex flex-col overflow-hidden">
        <template v-if="payrollStore.currentDetail">
          <div class="bg-white border-b border-gray-200 px-6 py-4">
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 class="text-xl font-bold text-gray-900">
                  {{ payrollStore.currentDetail.sheet.name }}
                </h1>
                <p class="text-sm text-gray-500 mt-1">
                  更新时间：{{ payrollStore.currentDetail.sheet.updatedAt }}
                </p>
              </div>
              <div class="flex flex-wrap gap-3">
                <button
                  @click="handleAddPersonnel"
                  class="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                  :disabled="isMutating"
                >
                  <svg class="-ml-1 mr-2 h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                  添加人员
                </button>
                <button
                  @click="handleExport"
                  class="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                  :disabled="isMutating || payrollStore.currentDetail.records.length === 0"
                >
                  <svg class="-ml-1 mr-2 h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  导出 Excel
                </button>
              </div>
            </div>
          </div>

          <div class="px-6 py-4">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="bg-white rounded-lg shadow px-5 py-4">
                <div class="flex items-center">
                  <div class="flex-shrink-0 bg-blue-100 rounded-md p-3">
                    <svg class="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div class="ml-5 w-0 flex-1">
                    <dl>
                      <dt class="text-sm font-medium text-gray-500 truncate">人员数</dt>
                      <dd class="text-lg font-semibold text-gray-900">
                        {{ payrollStore.currentDetail.sheet.personnelCount }} 人
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
              <div class="bg-white rounded-lg shadow px-5 py-4">
                <div class="flex items-center">
                  <div class="flex-shrink-0 bg-green-100 rounded-md p-3">
                    <svg class="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div class="ml-5 w-0 flex-1">
                    <dl>
                      <dt class="text-sm font-medium text-gray-500 truncate">实发合计</dt>
                      <dd class="text-lg font-semibold text-green-600">
                        ¥{{ formatCurrency(payrollStore.currentDetail.sheet.totalNetPay) }}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="flex-1 overflow-auto px-6 pb-6">
            <PayrollRecordTable
              :records="payrollStore.currentDetail.records"
              :is-mutating="isMutating"
              @update-net-pay="handleUpdateNetPay"
              @update-export-weight="handleUpdateExportWeight"
              @remove-personnel="handleRemovePersonnel"
            />
          </div>
        </template>

        <template v-else-if="payrollStore.detailLoading">
          <div class="flex-1 flex items-center justify-center">
            <div class="text-center text-gray-500">
              <svg class="animate-spin h-8 w-8 mx-auto mb-2 text-blue-600" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              加载中...
            </div>
          </div>
        </template>

        <template v-else>
          <div class="flex-1 flex items-center justify-center">
            <div class="text-center">
              <div class="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 mx-auto">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h2 class="text-xl font-semibold text-gray-700 mb-2">选择或创建工资表</h2>
              <p class="text-gray-500 mb-4">从左侧列表选择一个工资表查看详情</p>
              <button
                @click="handleCreateSheet"
                class="inline-flex items-center px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                <svg class="-ml-1 mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                </svg>
                新建工资表
              </button>
            </div>
          </div>
        </template>
      </div>
    </div>

    <Teleport to="body">
      <Transition name="fade">
        <div v-if="payrollStore.createDialogOpen" class="fixed inset-0 z-50 overflow-y-auto">
          <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div
              class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              @click="payrollStore.closeCreateDialog()"
            />
            <span class="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div class="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md sm:w-full sm:p-6">
              <div class="flex items-center justify-between mb-4">
                <h3 class="text-lg font-medium text-gray-900">
                  新建工资表
                </h3>
                <button
                  @click="payrollStore.closeCreateDialog()"
                  class="bg-white rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  :disabled="payrollStore.isCreating"
                >
                  <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  工资表名称 <span class="text-red-500">*</span>
                </label>
                <input
                  v-model="newSheetName"
                  type="text"
                  placeholder="请输入工资表名称"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  :disabled="payrollStore.isCreating"
                  @keyup.enter="confirmCreateSheet"
                />
              </div>
              <div class="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  @click="confirmCreateSheet"
                  class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm transition-colors"
                  :disabled="payrollStore.isCreating || !newSheetName.trim()"
                >
                  {{ payrollStore.isCreating ? '创建中...' : '创建' }}
                </button>
                <button
                  type="button"
                  @click="payrollStore.closeCreateDialog()"
                  class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:w-auto sm:text-sm transition-colors"
                  :disabled="payrollStore.isCreating"
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <Teleport to="body">
      <Transition name="fade">
        <div v-if="payrollStore.deleteConfirmOpen" class="fixed inset-0 z-50 overflow-y-auto">
          <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div
              class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              @click="payrollStore.closeDeleteConfirm()"
            />
            <span class="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div class="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <div class="sm:flex sm:items-start">
                <div class="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                  <svg class="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div class="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                  <h3 class="text-lg leading-6 font-medium text-gray-900">
                    确认删除
                  </h3>
                  <div class="mt-2">
                    <p class="text-sm text-gray-500">
                      确定要删除工资表 <span class="font-medium text-gray-900">{{ payrollStore.pendingDeleteSheet?.name }}</span> 吗？此操作不可撤销。
                    </p>
                  </div>
                </div>
              </div>
              <div class="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  @click="confirmDeleteSheet"
                  class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm transition-colors"
                  :disabled="payrollStore.isDeleting"
                >
                  {{ payrollStore.isDeleting ? '删除中...' : '确认删除' }}
                </button>
                <button
                  type="button"
                  @click="payrollStore.closeDeleteConfirm()"
                  class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:w-auto sm:text-sm transition-colors"
                  :disabled="payrollStore.isDeleting"
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <PersonnelPickerDialog
      v-model:open="payrollStore.personnelPickerOpen"
      :personnel-list="availablePersonnel"
      :selected-ids="selectedPersonnelIds"
      :is-busy="payrollStore.isAddingPersonnel"
      @selection-change="handleSelectionChange"
      @confirm="handleConfirmAddPersonnel"
    />
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
