import { loadEnvConfig } from "@next/env";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

export function loadDatabaseEnvironment(environment: string | undefined, directory = process.cwd()) {
  if (environment !== "development" && environment !== "production") {
    throw new Error("必须明确指定 development 或 production 数据库环境");
  }
  // Next.js 会加载通用文件；禁止其中包含数据库配置，防止误连另一套环境。
  for (const file of [".env", ".env.local"]) {
    const path = resolve(directory, file);
    if (existsSync(path) && /^\s*(?:export\s+)?DB_\w+\s*=/m.test(readFileSync(path, "utf8"))) {
      throw new Error("请将数据库配置移至对应环境文件，不能使用通用环境文件");
    }
  }
  Object.assign(process.env, { NODE_ENV: environment });
  loadEnvConfig(directory, environment === "development", { info() {}, error() {} }, true);
}
