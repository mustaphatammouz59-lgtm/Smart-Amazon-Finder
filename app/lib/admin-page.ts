import { env } from 'cloudflare:workers'
import { accessConfigFromEnv } from './access'
import { ApiError } from './api'
import { requireAdmin } from './auth'
import type { AdminActor } from './db/admin'

export type AdminContextResult =
  { ok: true; actor: AdminActor; db: D1Database } | { ok: false; status: 401 | 403 }

export async function adminContext(
  request: Request,
  area: string,
  action: 'read' | 'write' | 'publish',
): Promise<AdminContextResult> {
  const db = (env as Env).DB as D1Database
  try {
    const actor = await requireAdmin(request, db, area, action, accessConfigFromEnv(env))
    return { ok: true, actor, db }
  } catch (error) {
    if (error instanceof ApiError && error.code === 'UNAUTHENTICATED') {
      return { ok: false, status: 401 }
    }
    if (error instanceof ApiError && error.code === 'FORBIDDEN') {
      return { ok: false, status: 403 }
    }
    throw error
  }
}
