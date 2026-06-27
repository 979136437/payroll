import { defineEventHandler, readBody } from 'h3'
import { createPersonnel, type CreatePersonnelInput } from '#server/services/personnel.service'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody<CreatePersonnelInput>(event)

    if (!body?.name || body.name.trim() === '') {
      throw createError({
        statusCode: 400,
        message: '姓名不能为空',
      })
    }

    const data = await createPersonnel(body)
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
