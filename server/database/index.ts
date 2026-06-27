import { mkdirSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from './schema'

type DrizzleDb = ReturnType<typeof import('drizzle-orm/better-sqlite3').drizzle<typeof schema>>

let _db: DrizzleDb | null = null

export function getDb() {
  if (_db) return _db

  const dbPath = resolve(process.cwd(), 'data', 'payroll.db')
  const dbDir = dirname(dbPath)

  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true })
  }

  const sqlite = new Database(dbPath)
  sqlite.pragma('foreign_keys = ON')

  _db = drizzle(sqlite, { schema })
  return _db
}

export { schema }
export * from './schema'
