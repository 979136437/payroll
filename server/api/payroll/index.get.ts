import { defineEventHandler } from 'h3'
import { listPayrollSheets } from '#server/services/payroll.service'

export default defineEventHandler(async () => {
  try {
    const data = await listPayrollSheets()
    return { data }
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error)
    throw createError({
      statusCode: 500,
      message: errMsg,
    })
  }
})
