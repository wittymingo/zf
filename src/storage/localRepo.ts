import type { Match } from '../types'
import type { MatchRepository } from './types'

const STORAGE_KEY = 'zhuifen.match.v1'

// 未配置 Supabase 时的降级实现：只存一台设备、一局。
export function createLocalRepo(): MatchRepository {
  return {
    mode: 'local',

    async createMatch(playerNames, threeMode) {
      const now = Date.now()
      const players = playerNames.map((name, index) => ({
        id: uid(),
        name: name.trim() || `玩家${index + 1}`,
      }))
      const match: Match = {
        id: uid(),
        createdAt: now,
        updatedAt: now,
        players,
        actions: [],
        ...(players.length === 3 ? { threeMode: threeMode ?? 'all' } : {}),
      }
      write(match)
      return match
    },

    async loadMatch(matchId) {
      const match = read()
      return match && match.id === matchId ? match : null
    },

    async addAction(matchId, action) {
      const match = read()
      if (!match || match.id !== matchId) throw new Error('match not found')
      match.actions.push(action)
      match.updatedAt = action.at
      write(match)
    },

    async undoLast(matchId) {
      const match = read()
      if (!match || match.id !== matchId) throw new Error('match not found')
      match.actions.pop()
      match.updatedAt = Date.now()
      write(match)
    },

    async clearActions(matchId) {
      const match = read()
      if (!match || match.id !== matchId) throw new Error('match not found')
      match.actions = []
      match.updatedAt = Date.now()
      write(match)
    },

    async renamePlayer(matchId, playerId, name) {
      const match = read()
      if (!match || match.id !== matchId) throw new Error('match not found')
      match.players = match.players.map((player) => (player.id === playerId ? { ...player, name } : player))
      match.updatedAt = Date.now()
      write(match)
    },

    subscribe() {
      return () => {}
    },
  }
}

function read(): Match | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    return isMatch(parsed) ? parsed : null
  } catch {
    return null
  }
}

function write(match: Match) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(match))
  } catch {
    // 隐私模式或存储已满时静默降级，页面仍可正常计分
  }
}

function uid(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

function isMatch(value: unknown): value is Match {
  if (!value || typeof value !== 'object') return false
  const match = value as Partial<Match>
  const players = match.players
  const actions = match.actions

  if (typeof match.id !== 'string') return false
  if (!Array.isArray(players) || players.length === 0) return false
  if (!Array.isArray(actions)) return false
  if (match.threeMode !== undefined && match.threeMode !== 'all' && match.threeMode !== 'upper') return false

  const playersOk = players.every(
    (player) => player && typeof player.id === 'string' && typeof player.name === 'string',
  )
  if (!playersOk) return false

  const playerIds = new Set(players.map((player) => player.id))
  return actions.every(
    (action) =>
      action &&
      typeof action.playerId === 'string' &&
      playerIds.has(action.playerId) &&
      typeof action.delta === 'number' &&
      Number.isFinite(action.delta) &&
      (action.transfers === undefined ||
        (Array.isArray(action.transfers) &&
          action.transfers.every(
            (transfer) =>
              transfer &&
              typeof transfer.playerId === 'string' &&
              playerIds.has(transfer.playerId) &&
              typeof transfer.delta === 'number' &&
              Number.isFinite(transfer.delta),
          ))),
  )
}
