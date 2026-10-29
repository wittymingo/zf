export type ScoreTypeId =
  | 'bigGold'
  | 'smallGold'
  | 'goldNine'
  | 'normalWin'
  | 'foul'
  | 'normalBlack'
  | 'smallBlack'
  | 'bigBlack'
  | 'goldNineBlack'
  | 'freeNineBlack'
  | 'passFail'
  | 'passWin'
  | 'passSmallGold'
  | 'passBigGold'

export interface ScoreType {
  id: ScoreTypeId
  label: string
  delta: number
  buttonLabel?: string
}

export const SCORE_TYPES: readonly ScoreType[] = [
  { id: 'bigGold', label: '大金', delta: 10 },
  { id: 'smallGold', label: '小金', delta: 7 },
  { id: 'goldNine', label: '黄金9', delta: 4 },
  { id: 'normalWin', label: '普胜', delta: 4 },
  { id: 'foul', label: '犯规', delta: -1 },
  { id: 'normalBlack', label: '普黑金', delta: -4 },
  { id: 'smallBlack', label: '小黑金', delta: -7 },
  { id: 'bigBlack', label: '大黑金', delta: -10 },
  {
    id: 'goldNineBlack',
    label: '黄金9黑金',
    delta: -8,
    buttonLabel: '黄金9\n黑金',
  },
  {
    id: 'freeNineBlack',
    label: '自由球9黑金',
    delta: -4,
    buttonLabel: '自由球9\n黑金',
  },
  {
    id: 'passFail',
    label: '让杆解球失败',
    delta: -1,
    buttonLabel: '让杆解球\n失败',
  },
  { id: 'passWin', label: '让杆普胜', delta: 8 },
  { id: 'passSmallGold', label: '让杆小金', delta: 14 },
  { id: 'passBigGold', label: '让杆大金', delta: 20 },
]

export const SCORE_TYPE_BY_ID = new Map(SCORE_TYPES.map((type) => [type.id, type]))

export interface Player {
  id: string
  name: string
}

export interface ScoreTransfer {
  playerId: string
  delta: number
}

export interface ScoreAction {
  id: string
  playerId: string
  typeId: ScoreTypeId
  delta: number
  at: number
  // 三人追分一次操作会连带其他玩家，未记录时退化为只结算点击者
  transfers?: ScoreTransfer[]
}

export type ThreeMode = 'all' | 'upper'

export interface Match {
  id: string
  createdAt: number
  updatedAt: number
  players: Player[]
  actions: ScoreAction[]
  // 三人追分结算模式：all = 通赔（另外两家都赔），upper = 只赔上家
  threeMode?: ThreeMode
}

export function actionTransfers(action: ScoreAction): ScoreTransfer[] {
  if (action.transfers && action.transfers.length > 0) return action.transfers
  return [{ playerId: action.playerId, delta: action.delta }]
}

export function formatDelta(delta: number): string {
  return delta > 0 ? `+${delta}` : String(delta)
}
