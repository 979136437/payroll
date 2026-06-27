import { defineEventHandler, readMultipartFormData } from 'h3'
import { parsePersonnelImportRows, type PersonnelImportResult } from '#server/utils/excel'
import {
  listPersonnel,
  createPersonnel,
  updatePersonnel,
  reorderPersonnelByIds,
  type PersonnelSummary,
  type CreatePersonnelInput,
  type UpdatePersonnelInput,
} from '#server/services/personnel.service'

export default defineEventHandler(async (event) => {
  try {
    const form = await readMultipartFormData(event)

    if (!form || form.length === 0) {
      throw createError({
        statusCode: 400,
        message: '未找到上传的文件',
      })
    }

    const file = form.find((f) => f.name === 'file' || f.filename)
    if (!file || !file.data) {
      throw createError({
        statusCode: 400,
        message: '未找到上传的文件',
      })
    }

    const buffer = Buffer.from(file.data)
    const rows = parsePersonnelImportRows(buffer)

    const result: PersonnelImportResult = {
      createdCount: 0,
      updatedCount: 0,
      skippedCount: 0,
      errors: [],
    }

    const allPersonnel = await listPersonnel()
    const idCardMap = new Map<string, PersonnelSummary>()
    for (const p of allPersonnel) {
      if (p.idCardNumber) {
        idCardMap.set(p.idCardNumber, p)
      }
    }

    const importedIds: number[] = []

    const toCreateInput = (row: any): CreatePersonnelInput => ({
      name: row.name,
      gender: row.gender ?? null,
      ethnicity: row.ethnicity ?? null,
      nativePlace: row.nativePlace ?? null,
      idCardNumber: row.idCardNumber ?? null,
      payrollCardNumber: row.payrollCardNumber ?? null,
      bankName: row.bankName ?? null,
      jobType: row.jobType ?? null,
      startDate: row.startDate ?? null,
      endDate: row.endDate ?? null,
      phoneNumber: row.phoneNumber ?? null,
      remark: row.remark ?? null,
    })

    const toUpdateInput = (row: any): UpdatePersonnelInput => ({
      name: row.name,
      gender: row.gender ?? null,
      ethnicity: row.ethnicity ?? null,
      nativePlace: row.nativePlace ?? null,
      idCardNumber: row.idCardNumber ?? null,
      payrollCardNumber: row.payrollCardNumber ?? null,
      bankName: row.bankName ?? null,
      jobType: row.jobType ?? null,
      startDate: row.startDate ?? null,
      endDate: row.endDate ?? null,
      phoneNumber: row.phoneNumber ?? null,
      remark: row.remark ?? null,
    })

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const rowNum = i + 1

      try {
        if (!row || !row.name || row.name.trim() === '') {
          result.skippedCount++
          result.errors.push(`第 ${rowNum} 行：姓名为空，已跳过`)
          continue
        }

        const idCard = row.idCardNumber
        let existing: PersonnelSummary | null = null

        if (idCard) {
          existing = idCardMap.get(idCard) || null
        }

        if (existing) {
          await updatePersonnel(existing.id, toUpdateInput(row))
          importedIds.push(existing.id)
          result.updatedCount++
        } else {
          const newPersonnel = await createPersonnel(toCreateInput(row))
          importedIds.push(newPersonnel.id)
          result.createdCount++
        }
      } catch (error) {
        result.skippedCount++
        const errMsg = error instanceof Error ? error.message : String(error)
        result.errors.push(`第 ${rowNum} 行：${errMsg}`)
      }
    }

    const notImported = allPersonnel.filter((p) => !importedIds.includes(p.id))
    const allOrderedIds = [...importedIds, ...notImported.map((p) => p.id)]

    await reorderPersonnelByIds(allOrderedIds)

    return { data: result }
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
