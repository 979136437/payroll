import { defineConfig } from "drizzle-kit";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { readDbConfig } from "./db/config";
import { loadDatabaseEnvironment } from "./scripts/environment";

loadDatabaseEnvironment(process.env.DB_ENV);
const config = readDbConfig();
if (process.env.DB_COMMAND === "studio") mkdirSync(dirname(config.filename), { recursive: true });
export default defineConfig({
  dialect: "sqlite", 
  schema: "./db/schema.ts", 
  out: "./drizzle",
  ...(process.env.DB_COMMAND === "generate" ? {} : { dbCredentials: { url: config.filename } }),
});

