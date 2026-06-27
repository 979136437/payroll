<script setup lang="ts">
import type { PayrollSheetSummary } from '~/types'

interface Props {
  sheets: PayrollSheetSummary[]
  currentSheetId: number | null
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
})

const emit = defineEmits<{
  select: [id: number]
  create: []
  deleteIntent: [sheet: PayrollSheetSummary]
}>()

const formatCurrency = (value: number): string => {
  return value.toFixed(2)
}

const handleDeleteClick = (e: Event, sheet: PayrollSheetSummary) => {
  e.stopPropagation()
  emit('deleteIntent', sheet)
}
</script>

<template>
  <div class="h-full flex flex-col bg-white border-r border-gray-200">
    <div class="p-4 border-b border-gray-200">
      <div class="flex items-center justify-between mb-3">
        <h2 class="text-lg font-semibold text-gray-900">工资表</h2>
        <button
          @click="emit('create')"
          class="inline-flex items-center p-1.5 rounded-md text-blue-600 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
          :disabled="loading"
          title="新建工资表"
        >
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>
      <p class="text-xs text-gray-500">共 {{ sheets.length }} 个工资表</p>
    </div>

    <div class="flex-1 overflow-y-auto">
      <div v-if="loading" class="p-4 text-center text-gray-500 text-sm">
        加载中...
      </div>
      <div v-else-if="sheets.length === 0" class="p-4 text-center text-gray-500 text-sm">
        暂无工资表
      </div>
      <div v-else class="py-1">
        <div
          v-for="sheet in sheets"
          :key="sheet.id"
          @click="emit('select', sheet.id)"
          class="px-3 py-3 mx-2 my-1 rounded-lg cursor-pointer transition-colors group"
          :class="currentSheetId === sheet.id
            ? 'bg-blue-50 border border-blue-200'
            : 'hover:bg-gray-50 border border-transparent'"
        >
          <div class="flex items-start justify-between gap-2">
            <div class="flex-1 min-w-0">
              <div class="font-medium text-gray-900 text-sm truncate">
                {{ sheet.name }}
              </div>
              <div class="mt-1 flex items-center gap-3 text-xs text-gray-500">
                <span class="flex items-center gap-1">
                  <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  {{ sheet.personnelCount }} 人
                </span>
              </div>
              <div class="mt-1 text-xs font-medium text-green-600">
                ¥{{ formatCurrency(sheet.totalNetPay) }}
              </div>
            </div>
            <button
              @click="handleDeleteClick($event, sheet)"
              class="opacity-0 group-hover:opacity-100 p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 focus:opacity-100 transition-all"
              :disabled="loading"
              title="删除工资表"
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
