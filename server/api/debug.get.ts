// 测试文件 - 用于调试 ESM 加载问题
import { defineEventHandler } from 'h3'

export default defineEventHandler(() => {
  return {
    message: 'test handler works',
    cwd: process.cwd(),
  }
})
