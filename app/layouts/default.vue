<template>
  <div class="flex h-screen w-full bg-gray-50 font-sans">
    <aside class="flex w-16 flex-col items-center bg-gray-900 py-4 text-white">
      <div class="mb-8 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-lg font-bold">
        工
      </div>

      <nav class="flex flex-1 flex-col gap-2">
        <NuxtLink
          to="/"
          class="flex h-12 w-12 items-center justify-center rounded-lg transition-colors"
          :class="isActive('/') ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span class="sr-only">工资表</span>
        </NuxtLink>

        <NuxtLink
          to="/personnel"
          class="flex h-12 w-12 items-center justify-center rounded-lg transition-colors"
          :class="isActive('/personnel') ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          <span class="sr-only">人员管理</span>
        </NuxtLink>
      </nav>
    </aside>

    <div class="flex flex-1 flex-col overflow-hidden">
      <header class="flex h-14 items-center border-b border-gray-200 bg-white px-6">
        <h1 class="text-lg font-semibold text-gray-800">{{ pageTitle }}</h1>
      </header>

      <main class="flex-1 overflow-auto p-6">
        <slot />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

const isActive = (path: string) => {
  if (path === '/') {
    return route.path === '/'
  }
  return route.path.startsWith(path)
}

const pageTitle = computed(() => {
  if (route.path === '/') return '工资表管理'
  if (route.path.startsWith('/personnel')) return '人员管理'
  return '工资工作台'
})
</script>
