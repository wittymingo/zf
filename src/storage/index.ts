import { supabase } from '../supabase'
import type { Match } from '../types'
import { createLocalRepo } from './localRepo'
import { createSupabaseRepo } from './supabaseRepo'
import type { LastMatchMeta } from './types'

export const matchRepo = supabase ? createSupabaseRepo(supabase) : createLocalRepo()
export const isSharedMode = matchRepo.mode === 'shared'

const LAST_MATCH_KEY = 'zhuifen.lastMatch.v1'

export function loadLastMatchMeta(): LastMatchMeta | null {
  try {
    const raw = window.localStorage.getItem(LAST_MATCH_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    const meta = parsed as Partial<LastMatchMeta>
    if (typeof meta.id !== 'string' || typeof meta.playerCount !== 'number') return null
    return {
      id: meta.id,
      playerCount: meta.playerCount,
      actionCount: typeof meta.actionCount === 'number' ? meta.actionCount : 0,
      updatedAt: typeof meta.updatedAt === 'number' ? meta.updatedAt : 0,
    }
  } catch {
    return null
  }
}

export function saveLastMatchMeta(match: Match) {
  try {
    const meta: LastMatchMeta = {
      id: match.id,
      playerCount: match.players.length,
      actionCount: match.actions.length,
      updatedAt: match.updatedAt,
    }
    window.localStorage.setItem(LAST_MATCH_KEY, JSON.stringify(meta))
  } catch {
    // 存不下不影响计分
  }
}
