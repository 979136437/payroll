import { defineEventHandler, setHeader } from 'h3'
import { exportPersonnelExcel } from '#server/utils/excel'
import { listPersonnel } from '#server/services/personnel.service'

export default defineEventHandler(async (event) => {
  try {
    const personnelList = await listPersonnel()

    const buffer = exportPersonnelExcel(() => personnelList)

    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const filename = `人员花名册_${year}${month}${day}.xlsx`

    setHeader(event, 'Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    setHeader(event, 'Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`)

    return buffer
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error)
    throw createError({
      statusCode: 500,
      message: errMsg,
    })
  }
})
