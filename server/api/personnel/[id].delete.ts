import { defineEventHandler, getRouterParam } from 'h3'
import { deletePersonnel } from '#server/services/personnel.service'

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

    const deleted = await deletePersonnel(id)
    return { data: { deleted } }
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
