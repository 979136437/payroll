import { defineEventHandler } from 'h3'
import { listPersonnel } from '../../services/personnel.service'

export default defineEventHandler(async () => {
  try {
    const data = await listPersonnel()
    return { data }
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error)
    throw createError({
      statusCode: 500,
      message: errMsg,
    })
  }
})
