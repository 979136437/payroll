import { personnelRepository } from "@/features/personnel/server/repository";
import { checkOrigin, handle, readBody } from "@/features/personnel/server/http";
import { MAX_FILE_SIZE, readRoster } from "@/features/personnel/server/workbook";

export const runtime = "nodejs";
export async function POST(request: Request) {
  return handle(async () => {
    checkOrigin(request);
    const rows = await readRoster(await readBody(request, MAX_FILE_SIZE));
    await personnelRepository.importPeople(rows);
    return Response.json({ count: rows.length });
  });
}
