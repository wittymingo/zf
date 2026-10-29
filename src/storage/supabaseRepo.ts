import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js'
import type { Player, ScoreAction, ScoreTransfer, ScoreTypeId, ThreeMode } from '../types'
import type { MatchRepository, SyncState } from './types'

interface MatchRow {
  id: string
  created_at: string
  three_mode: string | null
}

interface PlayerRow {
  id: string
  seat: number
  name: string
}

interface ActionRow {
  id: string
  player_id: string
  type_id: string
  delta: number
  created_at: string
  transfers: unknown
}

export function createSupabaseRepo(client: SupabaseClient): MatchRepository {
  return {
    mode: 'shared',

    async createMatch(playerNames, threeMode) {
      const matchId = uid()
      const players = playerNames.map((name, index) => ({
        id: uid(),
        match_id: matchId,
        seat: index,
        name: name.trim() || `玩家${index + 1}`,
      }))

      const { error: matchError } = await client
        .from('matches')
        .insert(players.length === 3 ? { id: matchId, three_mode: threeMode ?? 'all' } : { id: matchId })
      if (matchError) throw matchError

      const { error: playersError } = await client.from('match_players').insert(players)
      if (playersError) {
        await client.from('matches').delete().eq('id', matchId)
        throw playersError
      }

      const now = Date.now()
      return {
        id: matchId,
        createdAt: now,
        updatedAt: now,
        players: players.map(({ id, name }) => ({ id, name })),
        actions: [],
        ...(players.length === 3 ? { threeMode: threeMode ?? 'all' } : {}),
      }
    },

    async loadMatch(matchId) {
      const { data: matchRow, error: matchError } = await client
        .from('matches')
        .select('id, created_at, three_mode')
        .eq('id', matchId)
        .maybeSingle()
      if (matchError) throw matchError
      if (!matchRow) return null

      const [playersResult, actionsResult] = await Promise.all([
        client.from('match_players').select('id, seat, name').eq('match_id', matchId).order('seat'),
        client
          .from('match_actions')
          .select('id, player_id, type_id, delta, created_at, transfers')
          .eq('match_id', matchId)
          .order('created_at')
          .order('id'),
      ])
      if (playersResult.error) throw playersResult.error
      if (actionsResult.error) throw actionsResult.error

      const match = matchRow as MatchRow
      const players = ((playersResult.data ?? []) as PlayerRow[]).map<Player>((row) => ({
        id: row.id,
        name: row.name,
      }))
      const actions = ((actionsResult.data ?? []) as ActionRow[]).map<ScoreAction>((row) => {
        const transfers = parseTransfers(row.transfers)
        return {
          id: row.id,
          playerId: row.player_id,
          typeId: row.type_id as ScoreTypeId,
          delta: row.delta,
          at: Date.parse(row.created_at),
          ...(transfers ? { transfers } : {}),
        }
      })

      return {
        id: match.id,
        createdAt: Date.parse(match.created_at),
        updatedAt: actions.length > 0 ? actions[actions.length - 1].at : Date.parse(match.created_at),
        players,
        actions,
        ...(players.length === 3 ? { threeMode: parseThreeMode(match.three_mode) } : {}),
      }
    },

    async addAction(matchId, action) {
      const { error } = await client.from('match_actions').insert({
        id: action.id,
        match_id: matchId,
        player_id: action.playerId,
        type_id: action.typeId,
        delta: action.delta,
        transfers: action.transfers ?? null,
      })
      if (error) throw error
    },

    async undoLast(matchId) {
      const { data, error } = await client
        .from('match_actions')
        .select('id')
        .eq('match_id', matchId)
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .limit(1)
      if (error) throw error
      const latest = (data ?? [])[0] as { id: string } | undefined
      if (!latest) return

      const { error: deleteError } = await client.from('match_actions').delete().eq('id', latest.id)
      if (deleteError) throw deleteError
    },

    async clearActions(matchId) {
      const { error } = await client.from('match_actions').delete().eq('match_id', matchId)
      if (error) throw error
    },

    async renamePlayer(matchId, playerId, name) {
      const { error } = await client
        .from('match_players')
        .update({ name })
        .eq('match_id', matchId)
        .eq('id', playerId)
      if (error) throw error
    },

    subscribe(matchId, onChange, onSyncState) {
      const channel: RealtimeChannel = client
        .channel(`match:${matchId}:${uid().slice(0, 8)}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'match_actions', filter: `match_id=eq.${matchId}` },
          () => onChange(),
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'match_players', filter: `match_id=eq.${matchId}` },
          () => onChange(),
        )
        .subscribe((status) => {
          const state: SyncState =
            status === 'SUBSCRIBED' ? 'live' : status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED' ? 'offline' : 'connecting'
          onSyncState(state)
        })

      return () => {
        void client.removeChannel(channel)
      }
    },
  }
}

function parseThreeMode(value: unknown): ThreeMode {
  return value === 'upper' ? 'upper' : 'all'
}

function parseTransfers(value: unknown): ScoreTransfer[] | undefined {
  if (!Array.isArray(value)) return undefined
  const list = value.filter(
    (item): item is ScoreTransfer =>
      Boolean(item) &&
      typeof item.playerId === 'string' &&
      typeof item.delta === 'number' &&
      Number.isFinite(item.delta),
  )
  return list.length > 0 ? list : undefined
}

function uid(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}
