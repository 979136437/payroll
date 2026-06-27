import tailwindcss from "@tailwindcss/vite";

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: [// '@nuxt/devtools',
    '@nuxt/eslint', '@nuxt/test-utils', '@nuxt/icon',
    '@nuxt/image', '@nuxt/ui', '@pinia/nuxt', 'nuxt-skill-hub'],
  skillHub: {
    targets: ['claude-code'],
    generationMode: 'prepare',
    remote: {
      refresh: true,
      timeoutMs: 1500,
      concurrency: 8,
      githubHeuristics: false,
      timings: false,
    },
  },
  fonts: {
    providers: {
      adobe: false,
      bunny: false,
      fontshare: false,
      fontsource: false,
      google: false,
      googleicons: false,
    },
    // 2. 禁用自动发现（防止意外加载）
    defaults: {
      weights: [],
      styles: [],
      subsets: []
    }
  },
  vite: {
    plugins: [
      //@ts-expect-error: 忽略 tailwindcss 插件的类型错误提示
      tailwindcss(),
    ],
  },

  // 2. 确保全局 CSS 被加载
  css: ['~/assets/css/main.css'],

  nitro: {
    externals: {
      inline: ['drizzle-orm'],
    },
    rollupConfig: {
      external: ['better-sqlite3'],
    },
  },
})