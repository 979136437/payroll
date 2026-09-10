import { personnelRepository } from "@/features/personnel/server/repository";
import { handle, readJson } from "@/features/personnel/server/http";
import { parseId, parsePerson } from "@/features/personnel/server/validation";

export const runtime = "nodejs";
export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    await personnelRepository.update(parseId((await context.params).id), parsePerson(await readJson(request)));
    return Response.json({ message: "人员已保存" });
  });
}
