import type { Player, ScoreTransfer, ScoreTypeId, ThreeMode } from './types'

type Seat = 'self' | 'upper' | 'lower'

interface RulePart {
  seat: Seat
  delta: number
}

// 三人追分 · 通赔：大金 / 黄金9 / 大黑金 / 黄金9黑金由另外两家都赔
const THREE_PLAYER_ALL_RULES: Record<ScoreTypeId, RulePart[]> = {
  bigGold: [
    { seat: 'self', delta: 20 },
    { seat: 'upper', delta: -10 },
    { seat: 'lower', delta: -10 },
  ],
  smallGold: [
    { seat: 'self', delta: 7 },
    { seat: 'upper', delta: -7 },
  ],
  goldNine: [
    { seat: 'self', delta: 8 },
    { seat: 'upper', delta: -4 },
    { seat: 'lower', delta: -4 },
  ],
  normalWin: [
    { seat: 'self', delta: 4 },
    { seat: 'upper', delta: -4 },
  ],
  foul: [
    { seat: 'self', delta: -1 },
    { seat: 'upper', delta: 1 },
  ],
  normalBlack: [
    { seat: 'self', delta: -4 },
    { seat: 'upper', delta: 4 },
  ],
  smallBlack: [
    { seat: 'self', delta: -7 },
    { seat: 'upper', delta: 7 },
  ],
  bigBlack: [
    { seat: 'self', delta: -20 },
    { seat: 'upper', delta: 10 },
    { seat: 'lower', delta: 10 },
  ],
  goldNineBlack: [
    { seat: 'self', delta: -8 },
    { seat: 'upper', delta: 4 },
    { seat: 'lower', delta: 4 },
  ],
  freeNineBlack: [
    { seat: 'self', delta: -4 },
    { seat: 'upper', delta: 4 },
  ],
  passFail: [
    { seat: 'self', delta: -1 },
    { seat: 'lower', delta: 1 },
  ],
  passWin: [
    { seat: 'self', delta: 8 },
    { seat: 'lower', delta: -8 },
  ],
  passSmallGold: [
    { seat: 'self', delta: 14 },
    { seat: 'lower', delta: -14 },
  ],
  passBigGold: [
    { seat: 'self', delta: 20 },
    { seat: 'upper', delta: 20 },
    { seat: 'lower', delta: -40 },
  ],
}

// 三人追分 · 只赔上家：通赔项也只由上一家赔单人份
const THREE_PLAYER_UPPER_RULES: Record<ScoreTypeId, RulePart[]> = {
  bigGold: [
    { seat: 'self', delta: 10 },
    { seat: 'upper', delta: -10 },
  ],
  smallGold: [
    { seat: 'self', delta: 7 },
    { seat: 'upper', delta: -7 },
  ],
  goldNine: [
    { seat: 'self', delta: 4 },
    { seat: 'upper', delta: -4 },
  ],
  normalWin: [
    { seat: 'self', delta: 4 },
    { seat: 'upper', delta: -4 },
  ],
  foul: [
    { seat: 'self', delta: -1 },
    { seat: 'upper', delta: 1 },
  ],
  normalBlack: [
    { seat: 'self', delta: -4 },
    { seat: 'upper', delta: 4 },
  ],
  smallBlack: [
    { seat: 'self', delta: -7 },
    { seat: 'upper', delta: 7 },
  ],
  bigBlack: [
    { seat: 'self', delta: -10 },
    { seat: 'upper', delta: 10 },
  ],
  goldNineBlack: [
    { seat: 'self', delta: -4 },
    { seat: 'upper', delta: 4 },
  ],
  freeNineBlack: [
    { seat: 'self', delta: -4 },
    { seat: 'upper', delta: 4 },
  ],
  passFail: [
    { seat: 'self', delta: -1 },
    { seat: 'lower', delta: 1 },
  ],
  passWin: [
    { seat: 'self', delta: 8 },
    { seat: 'lower', delta: -8 },
  ],
  passSmallGold: [
    { seat: 'self', delta: 14 },
    { seat: 'lower', delta: -14 },
  ],
  passBigGold: [
    { seat: 'self', delta: 20 },
    { seat: 'lower', delta: -20 },
  ],
}

function rulesFor(threeMode: ThreeMode): Record<ScoreTypeId, RulePart[]> {
  return threeMode === 'upper' ? THREE_PLAYER_UPPER_RULES : THREE_PLAYER_ALL_RULES
}

// 3 人时点击者自己的净得分；2 人只改点击者，其他人数沿用单人分值
export function scoreDelta(
  typeId: ScoreTypeId,
  playerCount: number,
  fallback: number,
  threeMode: ThreeMode = 'all',
): number {
  if (playerCount !== 3) return fallback
  return rulesFor(threeMode)[typeId]
    .filter((part) => part.seat === 'self')
    .reduce((total, part) => total + part.delta, 0)
}

export function buildTransfers(
  players: Player[],
  clickerId: string,
  typeId: ScoreTypeId,
  threeMode: ThreeMode = 'all',
): ScoreTransfer[] | undefined {
  if (players.length !== 3) return undefined
  const index = players.findIndex((player) => player.id === clickerId)
  if (index < 0) return undefined

  const rule = rulesFor(threeMode)[typeId]

  const touch = (seat: Seat) => {
    if (seat === 'self') return index
    if (seat === 'upper') return (index + players.length - 1) % players.length
    return (index + 1) % players.length
  }

  const totals = new Map<string, number>()
  for (const part of rule) {
    const target = players[touch(part.seat)].id
    totals.set(target, (totals.get(target) ?? 0) + part.delta)
  }

  return [...totals].map(([playerId, delta]) => ({ playerId, delta }))
}
