import { defineEventHandler, getRouterParam } from 'h3'
import { deletePayrollSheet } from '#server/services/payroll.service'

export default defineEventHandler(async (event) => {
  try {
    const idParam = getRouterParam(event, 'id')
    const id = Number(idParam)

    if (isNaN(id)) {
      throw createError({
        statusCode: 400,
        message: '无效的工资表ID',
      })
    }

    const data = await deletePayrollSheet(id)
    return { data }
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
