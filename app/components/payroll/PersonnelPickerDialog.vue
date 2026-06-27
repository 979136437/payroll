<script setup lang="ts">
import type { Personnel } from '~/types'

interface Props {
  open: boolean
  personnelList: Personnel[]
  selectedIds: number[]
  isBusy?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isBusy: false,
})

const emit = defineEmits<{
  'update:open': [value: boolean]
  selectionChange: [ids: number[]]
  confirm: [payload: { netPay?: number }]
}>()

const searchQuery = ref('')
const uniformNetPay = ref<string>('')
const useUniformNetPay = ref(false)

const selectedSet = computed(() => new Set(props.selectedIds))

const filteredPersonnel = computed(() => {
  if (!searchQuery.value.trim()) return props.personnelList
  const q = searchQuery.value.toLowerCase().trim()
  return props.personnelList.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      p.idCardNumber?.toLowerCase().includes(q) ||
      p.payrollCardNumber?.toLowerCase().includes(q) ||
      p.phoneNumber?.toLowerCase().includes(q),
  )
})

const isAllSelected = computed(() => {
  if (filteredPersonnel.value.length === 0) return false
  return filteredPersonnel.value.every((p) => selectedSet.value.has(p.id))
})

const isIndeterminate = computed(() => {
  const selectedInFiltered = filteredPersonnel.value.filter((p) => selectedSet.value.has(p.id)).length
  return selectedInFiltered > 0 && selectedInFiltered < filteredPersonnel.value.length
})

const toggleOne = (id: number) => {
  const newSelected = [...props.selectedIds]
  const index = newSelected.indexOf(id)
  if (index === -1) {
    newSelected.push(id)
  } else {
    newSelected.splice(index, 1)
  }
  emit('selectionChange', newSelected)
}

const toggleAll = () => {
  if (isAllSelected.value) {
    const filteredIds = new Set(filteredPersonnel.value.map((p) => p.id))
    const newSelected = props.selectedIds.filter((id) => !filteredIds.has(id))
    emit('selectionChange', newSelected)
  } else {
    const newSelected = [...props.selectedIds]
    const selected = new Set(newSelected)
    for (const p of filteredPersonnel.value) {
      if (!selected.has(p.id)) {
        newSelected.push(p.id)
      }
    }
    emit('selectionChange', newSelected)
  }
}

const handleConfirm = () => {
  if (props.selectedIds.length === 0) {
    alert('请至少选择一名人员')
    return
  }
  const payload: { netPay?: number } = {}
  if (useUniformNetPay.value && uniformNetPay.value.trim() !== '') {
    const val = parseFloat(uniformNetPay.value)
    if (!isNaN(val)) {
      payload.netPay = val
    }
  }
  emit('confirm', payload)
}

const handleClose = () => {
  emit('update:open', false)
}

watch(
  () => props.open,
  (val) => {
    if (val) {
      searchQuery.value = ''
      useUniformNetPay.value = false
      uniformNetPay.value = ''
    }
  },
)
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="open" class="fixed inset-0 z-50 overflow-y-auto">
        <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
          <div
            class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
            @click="handleClose"
          />
          <span class="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
          <div class="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full sm:p-6">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-lg font-medium text-gray-900">
                选择人员
              </h3>
              <button
                @click="handleClose"
                class="bg-white rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                :disabled="isBusy"
              >
                <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div class="mb-4">
              <div class="relative">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  v-model="searchQuery"
                  type="text"
                  placeholder="搜索姓名、身份证、工资卡号、电话..."
                  class="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  :disabled="isBusy"
                />
              </div>
            </div>

            <div class="mb-4">
              <label class="flex items-center gap-2 cursor-pointer">
                <input
                  v-model="useUniformNetPay"
                  type="checkbox"
                  class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  :disabled="isBusy"
                />
                <span class="text-sm text-gray-700">设置统一实发工资</span>
              </label>
              <div v-if="useUniformNetPay" class="mt-2">
                <input
                  v-model="uniformNetPay"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="请输入实发工资金额"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm"
                  :disabled="isBusy"
                />
              </div>
            </div>

            <div class="border border-gray-200 rounded-lg overflow-hidden max-h-96 overflow-y-auto">
              <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50 sticky top-0">
                  <tr>
                    <th class="px-4 py-3 text-left w-12">
                      <input
                        type="checkbox"
                        :checked="isAllSelected"
                        :indeterminate="isIndeterminate"
                        @change="toggleAll"
                        class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
                        :disabled="isBusy"
                      />
                    </th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      姓名
                    </th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      身份证号
                    </th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      工资卡号
                    </th>
                  </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                  <tr v-if="filteredPersonnel.length === 0">
                    <td colspan="4" class="px-4 py-8 text-center text-gray-500">
                      暂无匹配的人员
                    </td>
                  </tr>
                  <tr
                    v-for="person in filteredPersonnel"
                    :key="person.id"
                    class="hover:bg-gray-50 transition-colors cursor-pointer"
                    :class="{ 'bg-blue-50': selectedSet.has(person.id) }"
                    @click="toggleOne(person.id)"
                  >
                    <td class="px-4 py-3">
                      <input
                        type="checkbox"
                        :checked="selectedSet.has(person.id)"
                        @click.stop
                        @change="toggleOne(person.id)"
                        class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
                        :disabled="isBusy"
                      />
                    </td>
                    <td class="px-4 py-3 text-sm font-medium text-gray-900">
                      {{ person.name }}
                    </td>
                    <td class="px-4 py-3 text-sm text-gray-500 font-mono text-xs">
                      {{ person.idCardNumber || '-' }}
                    </td>
                    <td class="px-4 py-3 text-sm text-gray-500 font-mono text-xs">
                      {{ person.payrollCardNumber || '-' }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="mt-3 text-sm text-gray-500">
              已选择 <span class="font-medium text-blue-600">{{ selectedIds.length }}</span> 人
            </div>

            <div class="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
              <button
                type="button"
                @click="handleConfirm"
                class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm transition-colors"
                :disabled="isBusy || selectedIds.length === 0"
              >
                {{ isBusy ? '添加中...' : `确认添加 (${selectedIds.length}人)` }}
              </button>
              <button
                type="button"
                @click="handleClose"
                class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:w-auto sm:text-sm transition-colors"
                :disabled="isBusy"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
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
