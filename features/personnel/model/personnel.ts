export interface Person {
  id: string;
  name: string;
  gender: string;
  ethnicity: string;
  nativePlace: string;
  idCardNumber: string;
  salaryCardNumber: string;
  bankName: string;
  phone: string;
}

export function searchPeople(people: Person[], query: string) {
  const keyword = query.trim().toLowerCase();
  return people.filter((person) =>
    [person.name, person.phone, person.idCardNumber, person.salaryCardNumber]
      .some((value) => value.toLowerCase().includes(keyword)),
  );
}

export function paginate<T>(items: T[], requestedPage: number, pageSize = 10) {
  const size = Number.isFinite(pageSize) ? Math.max(1, Math.floor(pageSize)) : 10;
  const pages = Math.max(1, Math.ceil(items.length / size));
  const page = Number.isFinite(requestedPage)
    ? Math.min(pages, Math.max(1, Math.floor(requestedPage))) : 1;
  return { page, pages, items: items.slice((page - 1) * size, page * size) };
}

export function normalizePerson(person: Person): Person {
  const result = { ...person };
  for (const key of Object.keys(result) as (keyof Person)[]) {
    result[key] = result[key].trim();
    if (result[key].length > 100) throw new Error("人员字段不能超过100个字符");
  }
  if (!result.name) throw new Error("姓名不能为空");
  return result;
}
