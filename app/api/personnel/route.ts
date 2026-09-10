import { personnelRepository } from "@/features/personnel/server/repository";
import { handle, readJson } from "@/features/personnel/server/http";
import { parseIds, parsePerson, parseQuery } from "@/features/personnel/server/validation";
import { paginate, searchPeople } from "@/features/personnel/model/personnel";

export const runtime = "nodejs";
export async function GET(request: Request) {
  return handle(async () => {
    const { query, page, pageSize } = parseQuery(new URL(request.url));
    const all = await personnelRepository.list();
    const filtered = searchPeople(all, query);
    return Response.json({ ...paginate(filtered, page, pageSize), total: filtered.length, totalPeople: all.length });
  });
}
export async function POST(request: Request) {
  return handle(async () => Response.json({ id: await personnelRepository.create(parsePerson(await readJson(request))) }, { status: 201 }));
}
export async function DELETE(request: Request) {
  return handle(async () => {
    const body = await readJson(request);
    await personnelRepository.remove(parseIds(body?.ids));
    return Response.json({ message: "人员已删除" });
  });
}
