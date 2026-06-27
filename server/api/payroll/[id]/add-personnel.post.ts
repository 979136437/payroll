import { defineEventHandler, readBody, getRouterParam } from 'h3'
import { addPersonnelToSheet, addPersonnelToSheetWithNetPay } from '#server/services/payroll.service'

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

    const body = await readBody<{ personnelIds: number[]; netPay?: number }>(event)

    if (!body?.personnelIds || !Array.isArray(body.personnelIds)) {
      throw createError({
        statusCode: 400,
        message: '人员ID列表不能为空',
      })
    }

    if (body.netPay !== undefined) {
      if (typeof body.netPay !== 'number') {
        throw createError({
          statusCode: 400,
          message: '实发工资格式不正确',
        })
      }
      const data = await addPersonnelToSheetWithNetPay(sheetId, body.personnelIds, body.netPay)
      return { data }
    } else {
      await addPersonnelToSheet(sheetId, body.personnelIds)
      return { data: { success: true } }
    }
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
