import type { DemoState } from "./model/demo-state";

// 身份与账户字段使用占位文案，避免将演示数据误认为真实个人信息。
export function createInitialData(): DemoState {
  const people = ["张示例", "李示例", "王示例", "赵示例", "陈示例", "刘示例"].map((name, index) => ({
    id: `person-${index + 1}`, name, gender: index % 2 ? "女" : "男", ethnicity: "汉族",
    nativePlace: "示例市", idCardNumber: `演示证件-${index + 1}`,
    salaryCardNumber: `演示卡号-${index + 1}`, bankName: "示例银行", phone: `演示电话-${index + 1}`,
  }));
  return {
    people, activeId: "payroll-1",
    payrolls: [{
      id: "payroll-1", name: "2026年9月工资表（演示）",
      records: people.slice(0, 3).map((person, index) => ({ personId: person.id, amount: 520000 + index * 30000 })),
    }],
  };
}
