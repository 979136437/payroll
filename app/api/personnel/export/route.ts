import { personnelRepository } from "@/features/personnel/server/repository";
import { handle } from "@/features/personnel/server/http";
import { writeRoster } from "@/features/personnel/server/workbook";
import { parseQuery } from "@/features/personnel/server/validation";
import { searchPeople } from "@/features/personnel/model/personnel";

export const runtime = "nodejs";
export async function GET(request: Request) {
  return handle(async () => {
    const url = new URL(request.url);
    const { query } = parseQuery(url);
    const template = url.searchParams.get("template") === "1";
    const month = url.searchParams.get("month") ?? new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Shanghai" }).slice(0,7);
    const unit = (url.searchParams.get("unit") ?? "").trim();
    const people = template ? [] : searchPeople(await personnelRepository.list(), query);
    const buffer = await writeRoster(people, unit, month);
    const date = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Shanghai" });
    return new Response(new Uint8Array(buffer), { headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(template ? "花名册模板.xlsx" : `花名册_${date}.xlsx`)}`,
    } });
  });
}
