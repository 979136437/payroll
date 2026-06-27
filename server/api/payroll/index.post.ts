import { defineEventHandler, readBody } from 'h3'
import { createPayrollSheet, type CreatePayrollSheetInput } from '#server/services/payroll.service'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody<CreatePayrollSheetInput>(event)

    if (!body?.name || body.name.trim() === '') {
      throw createError({
        statusCode: 400,
        message: '工资表名称不能为空',
      })
    }

    const data = await createPayrollSheet(body)
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
