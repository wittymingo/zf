// 三人追分按上家 / 下家联动结算，与网页版 src/rules.ts 保持一致。
// 座次：上家 = 前一位（index + 2），下家 = 后一位（index + 1），按 3 人取模。

// 通赔：大金 / 黄金9 / 大黑金 / 黄金9黑金由另外两家都赔
const THREE_PLAYER_ALL_RULES = {
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

// 只赔上家：通赔项也只由上一家赔单人份
const THREE_PLAYER_UPPER_RULES = {
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

function rulesFor(threeMode) {
  return threeMode === 'upper' ? THREE_PLAYER_UPPER_RULES : THREE_PLAYER_ALL_RULES
}

// 3 人时点击者自己的净得分；2 人只改点击者，沿用单人分值
function scoreDelta(typeId, playerCount, fallback, threeMode) {
  if (playerCount !== 3) return fallback
  const parts = rulesFor(threeMode || 'all')[typeId]
  return parts.reduce(function (total, part) {
    return part.seat === 'self' ? total + part.delta : total
  }, 0)
}

function buildTransfers(players, clickerId, typeId, threeMode) {
  if (players.length !== 3) return undefined
  const index = players.findIndex(function (player) {
    return player.id === clickerId
  })
  if (index < 0) return undefined

  const rule = rulesFor(threeMode || 'all')[typeId]
  const targetIndex = function (seat) {
    if (seat === 'self') return index
    if (seat === 'upper') return (index + players.length - 1) % players.length
    return (index + 1) % players.length
  }

  const totals = {}
  const order = []
  rule.forEach(function (part) {
    const target = players[targetIndex(part.seat)].id
    if (!(target in totals)) {
      totals[target] = 0
      order.push(target)
    }
    totals[target] += part.delta
  })

  return order.map(function (playerId) {
    return { playerId: playerId, delta: totals[playerId] }
  })
}

module.exports = {
  scoreDelta: scoreDelta,
  buildTransfers: buildTransfers,
}
