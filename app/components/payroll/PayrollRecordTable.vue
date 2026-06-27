<script setup lang="ts">
import type { PayrollSheetRecordRow } from '~/types'

interface Props {
  records: PayrollSheetRecordRow[]
  isMutating?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isMutating: false,
})

const emit = defineEmits<{
  updateNetPay: [recordId: number, netPay: number]
  updateExportWeight: [recordId: number, exportWeight: number | null]
  removePersonnel: [personnelId: number]
}>()

const editingNetPay = ref<number | null>(null)
const editingExportWeight = ref<number | null>(null)
const netPayInput = ref<string>('')
const exportWeightInput = ref<string>('')

const formatCurrency = (value: number | null): string => {
  if (value === null || value === undefined) return '0.00'
  return value.toFixed(2)
}

const startEditNetPay = (record: PayrollSheetRecordRow) => {
  if (props.isMutating) return
  editingNetPay.value = record.recordId
  netPayInput.value = record.netPay !== null && record.netPay !== undefined ? String(record.netPay) : ''
}

const handleNetPayBlur = (record: PayrollSheetRecordRow) => {
  const value = parseFloat(netPayInput.value)
  if (!isNaN(value) && value !== record.netPay) {
    emit('updateNetPay', record.recordId, value)
  }
  editingNetPay.value = null
}

const handleNetPayKeydown = (e: KeyboardEvent, record: PayrollSheetRecordRow) => {
  if (e.key === 'Enter') {
    handleNetPayBlur(record)
  } else if (e.key === 'Escape') {
    editingNetPay.value = null
  }
}

const startEditExportWeight = (record: PayrollSheetRecordRow) => {
  if (props.isMutating) return
  editingExportWeight.value = record.recordId
  exportWeightInput.value = record.exportWeight !== null && record.exportWeight !== undefined
    ? String(record.exportWeight)
    : ''
}

const handleExportWeightBlur = (record: PayrollSheetRecordRow) => {
  const trimmed = exportWeightInput.value.trim()
  if (trimmed === '') {
    if (record.exportWeight !== null) {
      emit('updateExportWeight', record.recordId, null)
    }
  } else {
    const value = parseFloat(trimmed)
    if (!isNaN(value) && value !== record.exportWeight) {
      emit('updateExportWeight', record.recordId, value)
    }
  }
  editingExportWeight.value = null
}

const handleExportWeightKeydown = (e: KeyboardEvent, record: PayrollSheetRecordRow) => {
  if (e.key === 'Enter') {
    handleExportWeightBlur(record)
  } else if (e.key === 'Escape') {
    editingExportWeight.value = null
  }
}
</script>

<template>
  <div class="bg-white rounded-lg shadow overflow-hidden">
    <div class="overflow-x-auto">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
              序号
            </th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              姓名
            </th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              身份证号
            </th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              银行卡号
            </th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              开户行
            </th>
            <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-36">
              实发工资
            </th>
            <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
              外运重量
            </th>
            <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
              操作
            </th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          <tr v-if="records.length === 0">
            <td colspan="8" class="px-4 py-12 text-center text-gray-500">
              暂无人员，请点击"添加人员"按钮添加
            </td>
          </tr>
          <tr
            v-for="(record, index) in records"
            :key="record.recordId"
            class="hover:bg-gray-50 transition-colors"
          >
            <td class="px-4 py-3 text-sm text-gray-500">
              {{ index + 1 }}
            </td>
            <td class="px-4 py-3 text-sm font-medium text-gray-900">
              {{ record.name }}
            </td>
            <td class="px-4 py-3 text-sm text-gray-500 font-mono text-xs">
              {{ record.idCardNumber || '-' }}
            </td>
            <td class="px-4 py-3 text-sm text-gray-500 font-mono text-xs">
              {{ record.payrollCardNumber || '-' }}
            </td>
            <td class="px-4 py-3 text-sm text-gray-500">
              {{ record.bankName || '-' }}
            </td>
            <td class="px-4 py-3 text-sm text-right">
              <div v-if="editingNetPay === record.recordId">
                <input
                  ref="netPayInputRef"
                  v-model="netPayInput"
                  type="number"
                  step="0.01"
                  min="0"
                  class="w-full px-2 py-1 text-right border border-blue-500 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
                  @blur="handleNetPayBlur(record)"
                  @keydown="handleNetPayKeydown($event, record)"
                  :disabled="isMutating"
                  autofocus
                />
              </div>
              <div
                v-else
                class="cursor-pointer text-green-600 font-medium hover:text-green-700 hover:bg-green-50 px-2 py-1 rounded -mx-2 transition-colors"
                @click="startEditNetPay(record)"
              >
                ¥{{ formatCurrency(record.netPay) }}
              </div>
            </td>
            <td class="px-4 py-3 text-sm text-right">
              <div v-if="editingExportWeight === record.recordId">
                <input
                  v-model="exportWeightInput"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="可空"
                  class="w-full px-2 py-1 text-right border border-blue-500 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
                  @blur="handleExportWeightBlur(record)"
                  @keydown="handleExportWeightKeydown($event, record)"
                  :disabled="isMutating"
                  autofocus
                />
              </div>
              <div
                v-else
                class="cursor-pointer text-gray-600 hover:text-gray-900 hover:bg-gray-100 px-2 py-1 rounded -mx-2 transition-colors"
                @click="startEditExportWeight(record)"
              >
                <template v-if="record.exportWeight !== null && record.exportWeight !== undefined">
                  {{ record.exportWeight }}
                </template>
                <template v-else>
                  <span class="text-gray-400">-</span>
                </template>
              </div>
            </td>
            <td class="px-4 py-3 text-sm text-center">
              <button
                @click="emit('removePersonnel', record.personnelId)"
                class="text-red-600 hover:text-red-800 font-medium transition-colors"
                :disabled="isMutating"
              >
                移除
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
