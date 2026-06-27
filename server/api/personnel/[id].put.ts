import { defineEventHandler, getRouterParam, readBody } from 'h3'
import { updatePersonnel, type UpdatePersonnelInput } from '#server/services/personnel.service'

export default defineEventHandler(async (event) => {
  try {
    const idParam = getRouterParam(event, 'id')
    const id = Number(idParam)

    if (isNaN(id)) {
      throw createError({
        statusCode: 400,
        message: '无效的人员ID',
      })
    }

    const body = await readBody<UpdatePersonnelInput>(event)
    const data = await updatePersonnel(id, body)

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
