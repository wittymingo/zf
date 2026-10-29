import type { Match, ScoreAction, ThreeMode } from '../types'

export type SyncState = 'connecting' | 'live' | 'offline'

export interface MatchRepository {
  readonly mode: 'local' | 'shared'
  createMatch(playerNames: string[], threeMode?: ThreeMode): Promise<Match>
  loadMatch(matchId: string): Promise<Match | null>
  addAction(matchId: string, action: ScoreAction): Promise<void>
  undoLast(matchId: string): Promise<void>
  clearActions(matchId: string): Promise<void>
  renamePlayer(matchId: string, playerId: string, name: string): Promise<void>
  subscribe(matchId: string, onChange: () => void, onSyncState: (state: SyncState) => void): () => void
}

export interface LastMatchMeta {
  id: string
  playerCount: number
  actionCount: number
  updatedAt: number
}
