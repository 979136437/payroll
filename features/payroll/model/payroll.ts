export interface PayrollRecord { personId: string; amount: number | null }
export interface Payroll { id: string; name: string; records: PayrollRecord[] }

export function validateAmount(amount: number | null) {
  if (amount !== null && (!Number.isSafeInteger(amount) || amount < 0)) {
    throw new Error("金额必须是安全范围内的非负整数分");
  }
}

// 按字符串拆分元和分，避免小数乘法使工资金额产生精度误差。
export function parseAmount(input: string): number | null {
  const value = input.trim();
  if (!value) return null;
  if (value.length > 20 || !/^\d+(\.\d{1,2})?$/.test(value)) {
    throw new Error("请输入有效非负金额，最多保留两位小数");
  }
  const [yuan, fraction = ""] = value.split(".");
  const cents = BigInt(yuan) * BigInt(100) + BigInt(fraction.padEnd(2, "0"));
  if (cents > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error("金额超出允许范围");
  return Number(cents);
}

export function formatAmount(amount: number) {
  validateAmount(amount);
  return `${Math.floor(amount / 100).toLocaleString("zh-CN")}.${String(amount % 100).padStart(2, "0")}`;
}

export function totalAmount(records: PayrollRecord[]) {
  const total = records.reduce((sum, record) => {
    validateAmount(record.amount);
    return sum + BigInt(record.amount ?? 0);
  }, BigInt(0));
  // 单项金额合法不代表合计安全，汇总同样检查整数范围。
  if (total > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error("工资合计超出允许范围");
  return Number(total);
}

export function copyPayroll(id: string, name: string, source?: Payroll): Payroll {
  if (!name.trim()) throw new Error("工资表名称不能为空");
  if (name.trim().length > 80) throw new Error("工资表名称不能超过80个字符");
  return { id, name: name.trim(), records: source?.records.map((record) => ({ ...record })) ?? [] };
}

export function addPeople(payroll: Payroll, personIds: string[], amount: number | null): Payroll {
  validateAmount(amount);
  const existing = new Set(payroll.records.map((record) => record.personId));
  const additions = [...new Set(personIds)].filter((id) => !existing.has(id));
  const records = [...payroll.records, ...additions.map((personId) => ({ personId, amount }))];
  totalAmount(records);
  return { ...payroll, records };
}
