import { defineEventHandler, readBody, getRouterParam } from 'h3'
import { updatePayrollRecordExportWeight } from '#server/services/payroll.service'

export default defineEventHandler(async (event) => {
  try {
    const idParam = getRouterParam(event, 'id')
    const recordId = Number(idParam)

    if (isNaN(recordId)) {
      throw createError({
        statusCode: 400,
        message: '无效的记录ID',
      })
    }

    const body = await readBody<{ exportWeight: number | null }>(event)

    if (body?.exportWeight !== null && typeof body?.exportWeight !== 'number') {
      throw createError({
        statusCode: 400,
        message: '外运重量格式不正确',
      })
    }

    const data = await updatePayrollRecordExportWeight(recordId, body.exportWeight)
    return { data }
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
