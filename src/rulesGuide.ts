import { THREE_PLAYER_ALL_RULES, THREE_PLAYER_UPPER_RULES } from './rules'
import type { RulePart } from './rules'
import { SCORE_TYPES } from './types'
import type { ScoreTypeId } from './types'

export interface GuideRow {
  id: ScoreTypeId
  label: string
  self: number | null
  upper: number | null
  lower: number | null
}

// 两人模式不提供黄金9黑金 / 自由球9黑金，与计分页按钮一致
const TWO_PLAYER_HIDDEN: readonly ScoreTypeId[] = ['goldNineBlack', 'freeNineBlack']

function rowFromParts(typeId: ScoreTypeId, label: string, parts: readonly RulePart[]): GuideRow {
  const row: GuideRow = { id: typeId, label, self: null, upper: null, lower: null }
  for (const part of parts) row[part.seat] = part.delta
  return row
}

function rowsFromRules(rules: Record<ScoreTypeId, RulePart[]>): GuideRow[] {
  return SCORE_TYPES.map((type) => rowFromParts(type.id, type.label, rules[type.id]))
}

function sameRow(a: GuideRow, b: GuideRow): boolean {
  return a.self === b.self && a.upper === b.upper && a.lower === b.lower
}

export const TWO_PLAYER_ROWS: GuideRow[] = SCORE_TYPES.filter(
  (type) => !TWO_PLAYER_HIDDEN.includes(type.id),
).map((type) => rowFromParts(type.id, type.label, [{ seat: 'self', delta: type.delta }]))

export const THREE_ALL_ROWS = rowsFromRules(THREE_PLAYER_ALL_RULES)
export const THREE_UPPER_ROWS = rowsFromRules(THREE_PLAYER_UPPER_RULES)

// 只赔上家与通赔的差异项：两者只有 5 项不同，其余照常结算
export const THREE_UPPER_DIFF_ROWS = THREE_UPPER_ROWS.filter(
  (row, index) => !sameRow(row, THREE_ALL_ROWS[index]),
)

export const THREE_SAME_COUNT = THREE_ALL_ROWS.length - THREE_UPPER_DIFF_ROWS.length
