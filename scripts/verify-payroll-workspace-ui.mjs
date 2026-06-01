import { chromium } from "playwright-core"

const mockState = {
  personnel: [
    {
      bankName: null,
      ethnicity: null,
      gender: "男",
      id: 1,
      idCardNumber: null,
      jobType: "瓦工",
      name: "张三",
      nativePlace: null,
      payrollCardNumber: null,
      phoneNumber: "13800000000",
    },
    {
      bankName: null,
      ethnicity: null,
      gender: "女",
      id: 2,
      idCardNumber: null,
      jobType: null,
      name: "李四",
      nativePlace: null,
      payrollCardNumber: null,
      phoneNumber: null,
    },
  ],
  sheets: [
    {
      id: 101,
      name: "2026 年 5 月工资表",
      personnelCount: 1,
      updatedAt: "1717200000",
    },
    {
      id: 102,
      name: "2026 年 4 月工资表",
      personnelCount: 2,
      updatedAt: "1714608000",
    },
  ],
  details: {
    101: {
      records: [
        {
          jobType: "瓦工",
          name: "张三",
          netPay: 3200,
          personnelId: 1,
          phoneNumber: "13800000000",
          recordId: 9001,
        },
      ],
      sheet: {
        id: 101,
        name: "2026 年 5 月工资表",
        personnelCount: 1,
        updatedAt: "1717200000",
      },
    },
    102: {
      records: [
        {
          jobType: "瓦工",
          name: "张三",
          netPay: 3000,
          personnelId: 1,
          phoneNumber: "13800000000",
          recordId: 9002,
        },
        {
          jobType: null,
          name: "李四",
          netPay: 0,
          personnelId: 2,
          phoneNumber: null,
          recordId: 9003,
        },
      ],
      sheet: {
        id: 102,
        name: "2026 年 4 月工资表",
        personnelCount: 2,
        updatedAt: "1714608000",
      },
    },
  },
}

function serializeState() {
  return JSON.stringify(mockState)
}

const browser = await chromium.launch({
  channel: undefined,
  executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  headless: true,
})
const page = await browser.newPage()

page.on("console", (msg) => {
  if (msg.type() === "error") {
    process.stderr.write(`PAGE_CONSOLE_ERROR ${msg.text()}\n`)
  }
})

await page.addInitScript(({ initialState }) => {
  const state = JSON.parse(initialState)
  const clone = (value) => JSON.parse(JSON.stringify(value))

  const sheetById = (sheetId) =>
    state.sheets.find((sheet) => sheet.id === sheetId) ?? null

  window.__PAYROLL_VERIFY__ = {
    createSheetPayloads: [],
    createPersonnelPayloads: [],
    updatePersonnelPayloads: [],
  }

  window.__TAURI_INTERNALS__ = {
    callbacks: new Map(),
    convertFileSrc: (value) => value,
    invoke: async (cmd, args) => {
      switch (cmd) {
        case "list_personnel_command":
          return clone(state.personnel)
        case "list_payroll_sheets_command":
          return clone(state.sheets)
        case "get_payroll_sheet_detail_command":
          return clone(state.details[args.sheetId] ?? null)
        case "create_payroll_sheet_command": {
          window.__PAYROLL_VERIFY__.createSheetPayloads.push(clone(args.payload))
          const next = {
            id: 103,
            name: args.payload.name,
            personnelCount: args.payload.sourceSheetId ? 2 : 0,
            updatedAt: "1719800000",
          }
          state.sheets.unshift(next)
          state.details[next.id] = {
            records:
              args.payload.sourceSheetId && state.details[102]
                ? clone(state.details[102].records)
                : [],
            sheet: clone(next),
          }
          return clone(next)
        }
        case "create_personnel_command": {
          window.__PAYROLL_VERIFY__.createPersonnelPayloads.push(clone(args.payload))
          if (args.payload.idCardNumber === "dup-id-card") {
            throw new Error("身份证号码已存在")
          }
          const created = {
            bankName: args.payload.bankName ?? null,
            ethnicity: args.payload.ethnicity ?? null,
            gender: args.payload.gender ?? null,
            id: 3,
            idCardNumber: args.payload.idCardNumber ?? null,
            jobType: null,
            name: args.payload.name,
            nativePlace: args.payload.nativePlace ?? null,
            payrollCardNumber: args.payload.payrollCardNumber ?? null,
            phoneNumber: args.payload.phoneNumber ?? null,
          }
          state.personnel.push(created)
          return clone(created)
        }
        case "update_personnel_command": {
          window.__PAYROLL_VERIFY__.updatePersonnelPayloads.push(
            clone({ payload: args.payload, personnelId: args.personnelId }),
          )
          if (args.payload.idCardNumber === "dup-id-card") {
            throw new Error("身份证号码已存在")
          }
          const person = state.personnel.find((item) => item.id === args.personnelId)
          if (!person) {
            return null
          }
          person.name = args.payload.name
          person.gender = args.payload.gender ?? null
          person.ethnicity = args.payload.ethnicity ?? null
          person.nativePlace = args.payload.nativePlace ?? null
          person.idCardNumber = args.payload.idCardNumber ?? null
          person.payrollCardNumber = args.payload.payrollCardNumber ?? null
          person.bankName = args.payload.bankName ?? null
          person.phoneNumber = args.payload.phoneNumber ?? null
          return clone(person)
        }
        case "add_personnel_to_sheet_command": {
          const detail = state.details[args.sheetId]
          for (const personnelId of args.personnelIds) {
            const person = state.personnel.find((item) => item.id === personnelId)
            if (!person || detail.records.some((item) => item.personnelId === personnelId)) {
              continue
            }
            detail.records.push({
              jobType: person.jobType,
              name: person.name,
              netPay: 0,
              personnelId,
              phoneNumber: person.phoneNumber,
              recordId: 9500 + personnelId,
            })
          }
          const sheet = sheetById(args.sheetId)
          if (sheet) {
            sheet.personnelCount = detail.records.length
            detail.sheet.personnelCount = detail.records.length
          }
          return null
        }
        case "remove_personnel_from_sheet_command": {
          const detail = state.details[args.sheetId]
          detail.records = detail.records.filter(
            (record) => !args.personnelIds.includes(record.personnelId),
          )
          const sheet = sheetById(args.sheetId)
          if (sheet) {
            sheet.personnelCount = detail.records.length
            detail.sheet.personnelCount = detail.records.length
          }
          return null
        }
        case "update_payroll_record_net_pay_command": {
          const recordId = args.recordId
          for (const detail of Object.values(state.details)) {
            const record = detail.records.find((item) => item.recordId === recordId)
            if (record) {
              record.netPay = args.netPay
              return clone(record)
            }
          }
          return null
        }
        default:
          throw new Error(`Unhandled mock command: ${cmd}`)
      }
    },
    metadata: {
      currentWindow: { label: "main" },
      currentWebview: { label: "main" },
    },
    plugins: { path: { delimiter: ";", sep: "\\" } },
    runCallback: () => {},
    transformCallback: () => 1,
    unregisterCallback: () => {},
  }
  window.__TAURI_EVENT_PLUGIN_INTERNALS__ = {
    unregisterListener: () => {},
  }
}, { initialState: serializeState() })

await page.goto("http://127.0.0.1:5173/", { waitUntil: "networkidle" })

await page.waitForSelector("text=工资工作台")
const overviewText = await page.textContent("body")
await page.waitForSelector('button:has-text("人员管理")')
await page.click("text=新建工资表")
await page.waitForSelector("text=从往期导入人员")
await page.click('[role="combobox"]')
await page.click('[role="option"]:has-text("2026 年 4 月工资表")')
await page.fill('input[placeholder="例如：2026 年 5 月工资表"]', "2026 年 6 月工资表")
await page.click('button:has-text("创建工资表")')
await page.waitForSelector("text=2026 年 6 月工资表")

await page.click('button:has-text("添加人员")')
await page.waitForSelector("text=手工新增人员")
await page.fill('input[placeholder="例如：张三"]', "王五")
await page.click('text=请选择性别')
await page.click('button[role="option"]:has-text("女")')
await page.fill('input[placeholder="例如：汉"]', "汉")
await page.fill('input[placeholder="例如：河北"]', "河北")
await page.fill('input[placeholder="例如：130000199901010001"]', "130000199901019999")
await page.fill('input[placeholder="例如：6222000000000001"]', "6222000000000009")
await page.fill('input[placeholder="例如：中国建设银行"]', "中国银行")
await page.fill('input[placeholder="例如：13800000000"]', "13911112222")
await page.click('button:has-text("新增到人员库")')
await page.waitForSelector("text=人员已新增到人员库")
await page.waitForSelector("text=王五")
const payrollWorkspaceText = await page.textContent("body")
await page.click('button:has-text("关闭")')

await page.click('button:has-text("人员管理")')
await page.waitForSelector("text=人员资料列表")
await page.fill('input[placeholder="搜索姓名、联系电话、身份证号、工资卡号"]', "张三")
await page.waitForSelector("text=张三")
await page.click('button:has-text("编辑")')
await page.waitForSelector("text=编辑人员")
await page.fill('input[placeholder="例如：张三"]', "张三更新")
await page.fill('input[placeholder="例如：130000199901010001"]', "130000199901019998")
await page.click('button:has-text("保存人员信息")')
await page.waitForSelector("text=人员信息已更新")
await page.waitForSelector("text=张三更新")

const results = await page.evaluate(() => ({
  createPersonnelPayloads: window.__PAYROLL_VERIFY__.createPersonnelPayloads,
  createSheetPayloads: window.__PAYROLL_VERIFY__.createSheetPayloads,
  currentText: document.body.innerText,
  updatePersonnelPayloads: window.__PAYROLL_VERIFY__.updatePersonnelPayloads,
}))

if (
  results.createSheetPayloads.length !== 1 ||
  results.createSheetPayloads[0].sourceSheetId !== 102
) {
  throw new Error(`Unexpected createSheet payload: ${JSON.stringify(results.createSheetPayloads)}`)
}

if (
  results.createPersonnelPayloads.length !== 1 ||
  "jobType" in results.createPersonnelPayloads[0]
) {
  throw new Error(
    `Unexpected createPersonnel payload: ${JSON.stringify(results.createPersonnelPayloads)}`,
  )
}

if (
  results.updatePersonnelPayloads.length !== 1 ||
  results.updatePersonnelPayloads[0].personnelId !== 1
) {
  throw new Error(
    `Unexpected updatePersonnel payload: ${JSON.stringify(results.updatePersonnelPayloads)}`,
  )
}

const requiredOverviewTexts = [
  "工资工作台",
  "新建工资表",
  "人员管理",
]

for (const text of requiredOverviewTexts) {
  if (!overviewText?.includes(text)) {
    throw new Error(`Missing expected overview text: ${text}`)
  }
}

const requiredTexts = [
  "工资表导航",
  "手工新增人员",
  "性别",
  "民族",
  "籍贯",
  "身份证号码",
  "工资卡号",
  "开户行",
  "联系电话",
  "人员已新增到人员库",
]

for (const text of requiredTexts) {
  if (!payrollWorkspaceText?.includes(text)) {
    throw new Error(`Missing expected payroll text: ${text}`)
  }
}

const personnelPageTexts = [
  "人员资料列表",
  "人员信息已更新",
  "张三更新",
]

for (const text of personnelPageTexts) {
  if (!results.currentText.includes(text)) {
    throw new Error(`Missing expected personnel text: ${text}`)
  }
}

process.stdout.write("UI_VERIFY_PASS\n")

await browser.close()
