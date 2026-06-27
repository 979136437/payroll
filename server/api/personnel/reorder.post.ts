import { defineEventHandler, readBody } from 'h3'
import { reorderPersonnelByIds } from '#server/services/personnel.service'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody<{ ids: number[] }>(event)

    if (!body?.ids || !Array.isArray(body.ids)) {
      throw createError({
        statusCode: 400,
        message: '无效的请求参数',
      })
    }

    await reorderPersonnelByIds(body.ids)
    return { data: { success: true } }
  } catch (error) {
    if (error instanceof Error && error.name === 'H3Error') {
      throw error
    }
    const errMsg = error instanceof Error ? error.message : String(error)
    throw createError({
      statusCode: 500,
      message: errMsg,
    })
  }
})
