import { addPeople, copyPayroll, totalAmount, type Payroll } from "@/features/payroll/model/payroll";
import { normalizePerson, type Person } from "@/features/personnel/model/personnel";

export interface DemoState { people: Person[]; payrolls: Payroll[]; activeId: string }
export type DemoAction =
  | { type: "select"; id: string }
  | { type: "create"; id: string; name: string; sourceId: string }
  | { type: "deletePayroll"; id: string }
  | { type: "savePerson"; person: Person }
  | { type: "deletePeople"; ids: string[] }
  | { type: "addPeople"; id: string; ids: string[]; amount: number | null }
  | { type: "removeRecords"; id: string; ids: string[] }
  | { type: "amount"; id: string; personId: string; amount: number | null };

export function demoReducer(state: DemoState, action: DemoAction): DemoState {
  switch (action.type) {
    case "select":
      return { ...state, activeId: state.payrolls.some((item) => item.id === action.id) ? action.id : state.activeId };
    case "create":
      return {
        ...state, activeId: action.id,
        payrolls: [...state.payrolls, copyPayroll(action.id, action.name, state.payrolls.find((item) => item.id === action.sourceId))],
      };
    case "deletePayroll": {
      const payrolls = state.payrolls.filter((item) => item.id !== action.id);
      return { ...state, payrolls, activeId: state.activeId === action.id ? (payrolls[0]?.id ?? "") : state.activeId };
    }
    case "savePerson": {
      const person = normalizePerson(action.person);
      return {
        ...state, people: state.people.some((item) => item.id === person.id)
          ? state.people.map((item) => item.id === person.id ? person : item) : [...state.people, person],
      };
    }
    // 同步清理关联工资记录，保证人员库删除后工资表没有悬空引用。
    case "deletePeople":
      return {
        ...state, people: state.people.filter((item) => !action.ids.includes(item.id)),
        payrolls: state.payrolls.map((item) => ({
          ...item, records: item.records.filter((record) => !action.ids.includes(record.personId)),
        })),
      };
    default:
      return {
        ...state, payrolls: state.payrolls.map((item) => {
          if (item.id !== action.id) return item;
          if (action.type === "addPeople") {
            return addPeople(item, action.ids.filter((id) => state.people.some((person) => person.id === id)), action.amount);
          }
          const records = action.type === "removeRecords"
            ? item.records.filter((record) => !action.ids.includes(record.personId))
            : item.records.map((record) => record.personId === action.personId ? { ...record, amount: action.amount } : record);
          totalAmount(records);
          return { ...item, records };
        }),
      };
  }
}
