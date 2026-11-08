import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from './schema.js'

type Db = ReturnType<typeof createDb>

function createDb() {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL is not set (Neon Postgres connection string)')
  return drizzle({ client: neon(url), schema })
}

let instance: Db | undefined

/** Created lazily so the secret is read at request time, not at module load. */
export const db: Db = new Proxy({} as Db, {
  get(_t, prop) {
    instance ??= createDb()
    const value = Reflect.get(instance, prop)
    return typeof value === 'function' ? value.bind(instance) : value
  },
})
