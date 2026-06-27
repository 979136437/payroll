<script setup lang="ts">
import type { Personnel } from '~/types'

interface Props {
  personnel: Personnel[]
  selectedSet: Set<number>
  pageIndex: number
  pageSize: number
  totalFilteredCount: number
  totalPages: number
  isMutating?: boolean
  isAllSelected?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isMutating: false,
  isAllSelected: false,
})

const emit = defineEmits<{
  edit: [personnel: Personnel]
  deleteIntent: [personnel: Personnel]
  toggleOne: [id: number]
  toggleAll: []
  pageIndexChange: [page: number]
  pageSizeChange: [size: number]
}>()

const startIndex = computed(() => (props.pageIndex - 1) * props.pageSize + 1)
const endIndex = computed(() => Math.min(props.pageIndex * props.pageSize, props.totalFilteredCount))

const pageSizeOptions = [10, 20, 50, 100]

const displayPages = computed(() => {
  const pages: (number | string)[] = []
  const current = props.pageIndex
  const total = props.totalPages

  if (total <= 7) {
    for (let i = 1; i <= total; i++) pages.push(i)
    return pages
  }

  pages.push(1)

  if (current > 3) {
    pages.push('...')
  }

  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)

  for (let i = start; i <= end; i++) {
    pages.push(i)
  }

  if (current < total - 2) {
    pages.push('...')
  }

  pages.push(total)

  return pages
})

const goToPage = (page: number) => {
  if (page >= 1 && page <= props.totalPages && page !== props.pageIndex) {
    emit('pageIndexChange', page)
  }
}
</script>

<template>
  <div class="bg-white rounded-lg shadow overflow-hidden">
    <div class="overflow-x-auto">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-4 py-3 text-left w-12">
              <input
                type="checkbox"
                :checked="isAllSelected"
                :indeterminate="selectedSet.size > 0 && !isAllSelected"
                @change="emit('toggleAll')"
                class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
                :disabled="isMutating"
              />
            </th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
              序号
            </th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              姓名
            </th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
              性别
            </th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              工种
            </th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              身份证号码
            </th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              工资卡号
            </th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              联系电话
            </th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
              操作
            </th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          <tr v-if="personnel.length === 0">
            <td colspan="9" class="px-4 py-12 text-center text-gray-500">
              暂无数据
            </td>
          </tr>
          <tr
            v-for="(item, index) in personnel"
            :key="item.id"
            class="hover:bg-gray-50 transition-colors"
            :class="{ 'bg-blue-50': selectedSet.has(item.id) }"
          >
            <td class="px-4 py-3">
              <input
                type="checkbox"
                :checked="selectedSet.has(item.id)"
                @change="emit('toggleOne', item.id)"
                class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
                :disabled="isMutating"
              />
            </td>
            <td class="px-4 py-3 text-sm text-gray-500">
              {{ startIndex + index }}
            </td>
            <td class="px-4 py-3 text-sm font-medium text-gray-900">
              {{ item.name }}
            </td>
            <td class="px-4 py-3 text-sm text-gray-500">
              {{ item.gender || '-' }}
            </td>
            <td class="px-4 py-3 text-sm text-gray-500">
              {{ item.jobType || '-' }}
            </td>
            <td class="px-4 py-3 text-sm text-gray-500 font-mono text-xs">
              {{ item.idCardNumber || '-' }}
            </td>
            <td class="px-4 py-3 text-sm text-gray-500 font-mono text-xs">
              {{ item.payrollCardNumber || '-' }}
            </td>
            <td class="px-4 py-3 text-sm text-gray-500">
              {{ item.phoneNumber || '-' }}
            </td>
            <td class="px-4 py-3 text-sm space-x-2">
              <button
                @click="emit('edit', item)"
                class="text-blue-600 hover:text-blue-800 font-medium transition-colors"
                :disabled="isMutating"
              >
                编辑
              </button>
              <button
                @click="emit('deleteIntent', item)"
                class="text-red-600 hover:text-red-800 font-medium transition-colors"
                :disabled="isMutating"
              >
                删除
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="px-4 py-3 bg-gray-50 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3">
      <div class="text-sm text-gray-500">
        显示第 <span class="font-medium">{{ startIndex }}</span> - 
        <span class="font-medium">{{ endIndex }}</span> 条，
        共 <span class="font-medium">{{ totalFilteredCount }}</span> 条
      </div>

      <div class="flex items-center gap-4">
        <div class="flex items-center gap-2">
          <label class="text-sm text-gray-500">每页</label>
          <select
            :value="pageSize"
            @change="emit('pageSizeChange', Number(($event.target as HTMLSelectElement).value))"
            class="px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            :disabled="isMutating"
          >
            <option v-for="size in pageSizeOptions" :key="size" :value="size">
              {{ size }}
            </option>
          </select>
          <label class="text-sm text-gray-500">条</label>
        </div>

        <nav class="flex items-center gap-1">
          <button
            @click="goToPage(pageIndex - 1)"
            :disabled="pageIndex <= 1 || isMutating"
            class="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            上一页
          </button>

          <template v-for="(page, idx) in displayPages" :key="idx">
            <span v-if="page === '...'" class="px-2 text-gray-400">...</span>
            <button
              v-else
              @click="goToPage(page as number)"
              :disabled="isMutating"
              class="px-3 py-1 text-sm border rounded-md transition-colors"
              :class="page === pageIndex
                ? 'bg-blue-600 text-white border-blue-600'
                : 'border-gray-300 hover:bg-gray-100'"
            >
              {{ page }}
            </button>
          </template>

          <button
            @click="goToPage(pageIndex + 1)"
            :disabled="pageIndex >= totalPages || isMutating"
            class="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            下一页
          </button>
        </nav>
      </div>
    </div>
  </div>
</template>
