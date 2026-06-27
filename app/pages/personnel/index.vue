<script setup lang="ts">
import { usePersonnelStore } from '~/stores/personnel'
import type { Personnel, CreatePersonnelInput } from '~/types'

const store = usePersonnelStore()
const fileInputRef = ref<HTMLInputElement | null>(null)

onMounted(() => {
  store.fetchPersonnel()
})

const handleCreate = (payload: CreatePersonnelInput) => {
  store.createPersonnel(payload)
    .then(() => {
      store.closeDialog()
    })
    .catch((err) => {
      console.error('创建失败:', err)
    })
}

const handleUpdate = (payload: CreatePersonnelInput) => {
  if (!store.editingPersonnel) return
  store.updatePersonnel(store.editingPersonnel.id, payload)
    .then(() => {
      store.closeDialog()
    })
    .catch((err) => {
      console.error('更新失败:', err)
    })
}

const handleFormSubmit = (payload: CreatePersonnelInput) => {
  if (store.dialogMode === 'create') {
    handleCreate(payload)
  } else {
    handleUpdate(payload)
  }
}

const handleEdit = (personnel: Personnel) => {
  store.openEditDialog(personnel)
}

const handleDeleteIntent = (personnel: Personnel) => {
  store.openDeleteConfirm(personnel)
}

const confirmDelete = async () => {
  if (!store.pendingDeletePersonnel) return
  try {
    await store.deletePersonnel(store.pendingDeletePersonnel.id)
    store.closeDeleteConfirm()
  } catch (err) {
    console.error('删除失败:', err)
  }
}

const confirmBatchDelete = async () => {
  try {
    await store.deleteSelected()
    store.closeBatchDeleteConfirm()
  } catch (err) {
    console.error('批量删除失败:', err)
  }
}

const handleImportClick = () => {
  fileInputRef.value?.click()
}

const handleFileChange = async (e: Event) => {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  try {
    const result = await store.importExcel(file)
    alert(`导入成功，共导入 ${result.count} 条记录`)
  } catch (err: any) {
    alert(`导入失败: ${err.message || '未知错误'}`)
  } finally {
    target.value = ''
  }
}

const handleExport = async () => {
  try {
    await store.exportExcel()
  } catch (err: any) {
    alert(`导出失败: ${err.message || '未知错误'}`)
  }
}

const dialogTitle = computed(() =>
  store.dialogMode === 'create' ? '新建人员' : '编辑人员'
)
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <!-- 页面标题和操作栏 -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">人员管理</h1>
          <p class="text-sm text-gray-500 mt-1">管理所有员工信息</p>
        </div>
        <div class="flex flex-wrap gap-3">
          <button
            @click="handleImportClick"
            class="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            :disabled="store.loading"
          >
            <svg class="-ml-1 mr-2 h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            导入
          </button>
          <input
            ref="fileInputRef"
            type="file"
            accept=".xlsx,.xls"
            class="hidden"
            @change="handleFileChange"
          />
          <button
            @click="handleExport"
            class="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            :disabled="store.loading"
          >
            <svg class="-ml-1 mr-2 h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            导出
          </button>
          <button
            @click="store.openCreateDialog()"
            class="inline-flex items-center px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            :disabled="store.loading"
          >
            <svg class="-ml-1 mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            新建人员
          </button>
        </div>
      </div>

      <!-- 统计卡片 -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div class="bg-white rounded-lg shadow px-5 py-4">
          <div class="flex items-center">
            <div class="flex-shrink-0 bg-blue-100 rounded-md p-3">
              <svg class="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div class="ml-5 w-0 flex-1">
              <dl>
                <dt class="text-sm font-medium text-gray-500 truncate">总人数</dt>
                <dd class="text-lg font-semibold text-gray-900">{{ store.personnel.length }}</dd>
              </dl>
            </div>
          </div>
        </div>
        <div class="bg-white rounded-lg shadow px-5 py-4">
          <div class="flex items-center">
            <div class="flex-shrink-0 bg-green-100 rounded-md p-3">
              <svg class="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <div class="ml-5 w-0 flex-1">
              <dl>
                <dt class="text-sm font-medium text-gray-500 truncate">筛选结果</dt>
                <dd class="text-lg font-semibold text-gray-900">{{ store.filteredPersonnel.length }}</dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      <!-- 搜索框和批量操作 -->
      <div class="bg-white rounded-lg shadow mb-6">
        <div class="px-4 py-3 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div class="relative flex-1 max-w-md">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              :value="store.query"
              @input="store.setQuery(($event.target as HTMLInputElement).value)"
              type="text"
              placeholder="搜索姓名、身份证、工资卡号、电话..."
              class="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
          <div v-if="store.selectedIds.length > 0" class="flex items-center gap-3">
            <span class="text-sm text-gray-600">
              已选择 <span class="font-medium text-blue-600">{{ store.selectedIds.length }}</span> 项
            </span>
            <button
              @click="store.clearSelection()"
              class="text-sm text-gray-500 hover:text-gray-700"
            >
              取消选择
            </button>
            <button
              @click="store.openBatchDeleteConfirm()"
              class="inline-flex items-center px-3 py-1.5 border border-red-300 rounded-md text-sm font-medium text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
            >
              <svg class="-ml-0.5 mr-1.5 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              批量删除
            </button>
          </div>
        </div>
      </div>

      <!-- 人员表格 -->
      <PersonnelTable
        :personnel="store.paginatedPersonnel"
        :selected-set="store.selectedSet"
        :page-index="store.pageIndex"
        :page-size="store.pageSize"
        :total-filtered-count="store.filteredPersonnel.length"
        :total-pages="store.totalPages"
        :is-mutating="store.isSubmitting || store.isDeleting"
        :is-all-selected="store.isAllSelected"
        @edit="handleEdit"
        @delete-intent="handleDeleteIntent"
        @toggle-one="store.toggleSelect"
        @toggle-all="store.toggleSelectAll"
        @page-index-change="store.setPageIndex"
        @page-size-change="store.setPageSize"
      />
    </div>

    <!-- 新建/编辑对话框 -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="store.dialogOpen"
          class="fixed inset-0 z-50 overflow-y-auto"
        >
          <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div
              class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              @click="store.closeDialog()"
            />
            <span class="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div class="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full sm:p-6">
              <div class="flex items-center justify-between mb-4">
                <h3 class="text-lg font-medium text-gray-900">
                  {{ dialogTitle }}
                </h3>
                <button
                  @click="store.closeDialog()"
                  class="bg-white rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <PersonnelForm
                :initial-personnel="store.editingPersonnel"
                :is-busy="store.isSubmitting"
                @submit="handleFormSubmit"
              />
              <div class="mt-4 -mx-4 sm:-mx-6 border-t border-gray-200 pt-4 px-4 sm:px-6">
                <div class="flex justify-end">
                  <button
                    type="button"
                    @click="store.closeDialog()"
                    class="mr-3 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                    :disabled="store.isSubmitting"
                  >
                    取消
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- 删除确认对话框 -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="store.deleteConfirmOpen"
          class="fixed inset-0 z-50 overflow-y-auto"
        >
          <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div
              class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              @click="store.closeDeleteConfirm()"
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
                      确定要删除人员 <span class="font-medium text-gray-900">{{ store.pendingDeletePersonnel?.name }}</span> 吗？此操作不可撤销。
                    </p>
                  </div>
                </div>
              </div>
              <div class="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  @click="confirmDelete"
                  class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm transition-colors"
                  :disabled="store.isDeleting"
                >
                  {{ store.isDeleting ? '删除中...' : '确认删除' }}
                </button>
                <button
                  type="button"
                  @click="store.closeDeleteConfirm()"
                  class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:w-auto sm:text-sm transition-colors"
                  :disabled="store.isDeleting"
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- 批量删除确认对话框 -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="store.batchDeleteConfirmOpen"
          class="fixed inset-0 z-50 overflow-y-auto"
        >
          <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div
              class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              @click="store.closeBatchDeleteConfirm()"
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
                    批量删除确认
                  </h3>
                  <div class="mt-2">
                    <p class="text-sm text-gray-500">
                      确定要删除选中的 <span class="font-medium text-gray-900">{{ store.selectedIds.length }}</span> 名人员吗？此操作不可撤销。
                    </p>
                  </div>
                </div>
              </div>
              <div class="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  @click="confirmBatchDelete"
                  class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm transition-colors"
                  :disabled="store.isDeleting"
                >
                  {{ store.isDeleting ? '删除中...' : '确认删除' }}
                </button>
                <button
                  type="button"
                  @click="store.closeBatchDeleteConfirm()"
                  class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:w-auto sm:text-sm transition-colors"
                  :disabled="store.isDeleting"
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
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
