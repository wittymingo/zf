const { actionTransfers } = require('./types')

// 分数来自流水：三人一笔记分可能联动多个玩家
function computeScores(match) {
  const scores = {}
  match.players.forEach(function (player) {
    scores[player.id] = 0
  })
  match.actions.forEach(function (action) {
    actionTransfers(action).forEach(function (transfer) {
      if (!(transfer.playerId in scores)) return
      scores[transfer.playerId] += transfer.delta
    })
  })
  return scores
}

// 统计按点击者计数，联动加减不重复计
function computeCounts(match) {
  const counts = {}
  match.players.forEach(function (player) {
    counts[player.id] = {}
  })
  match.actions.forEach(function (action) {
    const perType = counts[action.playerId]
    if (!perType) return
    perType[action.typeId] = (perType[action.typeId] || 0) + 1
  })
  return counts
}

function buildStandings(match, scores) {
  return match.players
    .map(function (player, index) {
      return { player: player, index: index, score: scores[player.id] || 0 }
    })
    .sort(function (a, b) {
      return b.score - a.score
    })
}

// 3 人按两两对账：本人与另外两人的分差之和，三人合计恒为 0
function scoreGap(standings, playerId) {
  if (standings.length <= 1) return 0
  const me = standings.filter(function (row) {
    return row.player.id === playerId
  })[0]
  if (!me) return 0

  if (standings.length === 3) {
    return standings.reduce(function (sum, row) {
      return row.player.id === playerId ? sum : sum + (me.score - row.score)
    }, 0)
  }

  const total = standings.reduce(function (sum, row) {
    return sum + row.score
  }, 0)
  const rest = (total - me.score) / (standings.length - 1)
  return Math.round((me.score - rest) * 10) / 10
}

function nameOf(row) {
  return (row.player.name || '').trim() || '玩家' + (row.index + 1)
}

function buildVerdict(match, standings) {
  if (match.actions.length === 0) {
    return { text: '还没有记分，先打几杆吧', neutral: true, sub: '' }
  }
  const topScore = standings[0].score
  const leaders = standings.filter(function (row) {
    return row.score === topScore
  })
  if (leaders.length > 1) {
    return {
      text:
        leaders
          .map(function (row) {
            return nameOf(row)
          })
          .join('、') + ' 暂时并列第一',
      neutral: true,
      sub: '',
    }
  }
  const sub = standings.length > 1 ? '领先第二名 ' + (standings[0].score - standings[1].score) + ' 分' : ''
  return { text: '恭喜 ' + nameOf(standings[0]) + '，赢下比赛', neutral: false, sub: sub }
}

function buildSuggestions(match, counts, scores) {
  if (match.actions.length === 0) {
    return ['先记几笔分数，这里会结合大金、黑金和犯规次数给出针对性建议。']
  }

  function countOf(playerId, ids) {
    return ids.reduce(function (total, id) {
      return total + (counts[playerId][id] || 0)
    }, 0)
  }

  function leaderOf(ids) {
    return match.players
      .map(function (player, index) {
        return { name: (player.name || '').trim() || '玩家' + (index + 1), n: countOf(player.id, ids) }
      })
      .sort(function (a, b) {
        return b.n - a.n
      })[0]
  }

  const tips = []

  const fouls = leaderOf(['foul'])
  if (fouls && fouls.n >= 2) {
    tips.push(fouls.name + ' 已犯规 ' + fouls.n + ' 次，母球控制建议更保守，关键球优先做安全球。')
  }

  const blacks = leaderOf(['normalBlack', 'smallBlack', 'bigBlack', 'goldNineBlack', 'freeNineBlack'])
  if (blacks && blacks.n >= 2) {
    tips.push(blacks.name + ' 出现 ' + blacks.n + ' 次黑金，贴库球和袋口球别硬拼，及时转防守。')
  }

  const golds = leaderOf(['bigGold', 'smallGold'])
  if (golds && golds.n >= 2) {
    tips.push(golds.name + ' 大金/小金共 ' + golds.n + ' 次，开球和连续清台手感在线，保持进攻节奏。')
  }

  const goldNines = leaderOf(['goldNine'])
  if (goldNines && goldNines.n >= 2 && tips.length < 3) {
    tips.push(goldNines.name + ' 黄金9 打成 ' + goldNines.n + ' 次，9 号球的走位和收尾可以继续保持。')
  }

  if (tips.length < 3) {
    const ranked = Object.keys(scores)
      .map(function (id) {
        return scores[id]
      })
      .sort(function (a, b) {
        return b - a
      })
    if (ranked.length > 1) {
      const lead = ranked[0] - ranked[1]
      if (lead <= 5) {
        tips.push('分差很小，接下来一次犯规或黑金就可能改变结果，优先稳住母球。')
      } else if (lead >= 15) {
        tips.push('分差已经拉开，领先方放慢节奏，落后方多尝试主动进攻。')
      }
    }
  }

  const fallbacks = [
    '开球前先确认母球落点，减少白球摔袋和无谓犯规。',
    '中局优先处理难点球，进攻不顺时及时转防守。',
  ]
  for (let i = 0; i < fallbacks.length && tips.length < 3; i += 1) {
    tips.push(fallbacks[i])
  }

  return tips.slice(0, 3)
}

module.exports = {
  computeScores: computeScores,
  computeCounts: computeCounts,
  buildStandings: buildStandings,
  scoreGap: scoreGap,
  buildVerdict: buildVerdict,
  buildSuggestions: buildSuggestions,
  nameOf: nameOf,
}
