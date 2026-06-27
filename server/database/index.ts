import { mkdirSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { createRequire } from 'node:module'
import * as schema from './schema'

const require = createRequire(import.meta.url)

type DrizzleDb = ReturnType<typeof import('drizzle-orm/better-sqlite3').drizzle<typeof schema>>

let _db: DrizzleDb | null = null

export function getDb() {
  if (_db) return _db

  const dbPath = resolve(process.cwd(), 'data', 'payroll.db')
  const dbDir = dirname(dbPath)

  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true })
  }

  const Database = require('better-sqlite3')
  const { drizzle } = require('drizzle-orm/better-sqlite3')
  const sqlite = new Database(dbPath)
  sqlite.pragma('foreign_keys = ON')

  _db = drizzle(sqlite, { schema })
  return _db
}

export { schema }
export * from './schema'
