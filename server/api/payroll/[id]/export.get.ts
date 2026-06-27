import { defineEventHandler, setHeader, getRouterParam } from 'h3'
import { exportPayrollSheetExcel } from '#server/utils/excel'
import { listPersonnel } from '#server/services/personnel.service'
import { getPayrollSheetDetail } from '#server/services/payroll.service'

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

    const personnelList = await listPersonnel()
    const sheetDetail = await getPayrollSheetDetail(sheetId)

    if (!sheetDetail) {
      throw createError({
        statusCode: 404,
        message: '工资表不存在',
      })
    }

    const buffer = exportPayrollSheetExcel(sheetId, {
      listPersonnel: () => personnelList,
      getPayrollSheetDetail: () => sheetDetail,
    })

    const filename = `工资表_${sheetDetail.sheet.name}.xlsx`

    setHeader(event, 'Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    setHeader(event, 'Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`)

    return buffer
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
