import { defineEventHandler, readBody, getRouterParam } from 'h3'
import { removePersonnelFromSheet } from '#server/services/payroll.service'

export default defineEventHandler(async (event) => {
  try {
    const idParam = getRouterParam(event, 'id')
    const sheetId = Number(idParam)

    if (isNaN(sheetId)) {
      throw createError({
        statusCode: 400,
        message: '无效的工资表ID',
      })
    }

    const body = await readBody<{ personnelIds: number[] }>(event)

    if (!body?.personnelIds || !Array.isArray(body.personnelIds)) {
      throw createError({
        statusCode: 400,
        message: '人员ID列表不能为空',
      })
    }

    await removePersonnelFromSheet(sheetId, body.personnelIds)
    return { data: { success: true } }
  } catch (error) {
    if (error instanceof Error && error.name === 'H3Error') {
      throw error
    }
    const errMsg = error instanceof Error ? error.message : String(error)
    throw createError({
      statusCode: 400,
      message: errMsg,
    })
  }
})
