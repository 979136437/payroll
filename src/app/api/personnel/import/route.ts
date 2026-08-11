import { NextResponse } from "next/server";
import {
  apiErrorResponse,
  MAX_EXCEL_IMPORT_BYTES,
  MAX_EXCEL_IMPORT_REQUEST_BYTES,
} from "@/lib/api-route";
import { importPersonnelFromExcel } from "@/lib/services/excel.service";

async function readRequestBodyWithinLimit(
  request: Request,
  maxBytes: number
): Promise<ArrayBuffer | null> {
  const reader = request.body?.getReader();
  if (!reader) return new ArrayBuffer(0);

  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    totalBytes += value.byteLength;
    if (totalBytes > maxBytes) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }

  const body = new ArrayBuffer(totalBytes);
  const bodyBytes = new Uint8Array(body);
  let offset = 0;
  for (const chunk of chunks) {
    bodyBytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}

export async function POST(request: Request) {
  try {
    const contentLength = request.headers.get("content-length");
    if (contentLength != null) {
      const requestBytes = Number(contentLength);
      if (!Number.isSafeInteger(requestBytes) || requestBytes < 0) {
        return NextResponse.json(
          { error: "Content-Length 无效" },
          { status: 400 }
        );
      }
      if (requestBytes > MAX_EXCEL_IMPORT_REQUEST_BYTES) {
        return NextResponse.json(
          { error: "导入请求体过大" },
          { status: 413 }
        );
      }
    }

    const requestBody = await readRequestBodyWithinLimit(
      request,
      MAX_EXCEL_IMPORT_REQUEST_BYTES
    );
    if (requestBody == null) {
      return NextResponse.json({ error: "导入请求体过大" }, { status: 413 });
    }

    const boundedRequest = new Request(request.url, {
      method: request.method,
      headers: request.headers,
      body: requestBody,
    });
    let formData: FormData;
    try {
      formData = await boundedRequest.formData();
    } catch {
      return NextResponse.json(
        { error: "导入请求格式无效" },
        { status: 400 }
      );
    }
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "请选择文件" }, { status: 400 });
    }
    if (file.size > MAX_EXCEL_IMPORT_BYTES) {
      return NextResponse.json(
        { error: "导入文件不能超过 10 MB" },
        { status: 413 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await importPersonnelFromExcel(buffer);

    return NextResponse.json(result);
  } catch (error: unknown) {
    return apiErrorResponse(error, "导入失败", {
      "导入模板不匹配，请使用固定花名册表头": 400,
      "导入文件无法解析": 400,
    });
  }
}
