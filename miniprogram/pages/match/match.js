const { SCORE_TYPES, SCORE_TYPE_BY_ID, actionTransfers, formatDelta } = require('../../utils/types')
const { scoreDelta, buildTransfers } = require('../../utils/rules')
const store = require('../../utils/store')
const summary = require('../../utils/summary')

const ACCENTS = ['#0f7a55', '#c9871f', '#3b74c7', '#b0487a']

const POSITIVE_IDS = ['bigGold', 'smallGold', 'goldNine', 'normalWin']
const NEGATIVE_IDS = ['foul', 'normalBlack', 'smallBlack', 'bigBlack']
const SPECIAL_IDS = ['goldNineBlack', 'freeNineBlack', 'passFail', 'passWin', 'passSmallGold', 'passBigGold']
const PASS_IDS = ['passFail', 'passWin', 'passSmallGold', 'passBigGold']

function typesOf(ids) {
  return ids
    .map(function (id) {
      return SCORE_TYPE_BY_ID[id]
    })
    .filter(Boolean)
}

const POSITIVE_TYPES = typesOf(POSITIVE_IDS)
const NEGATIVE_TYPES = typesOf(NEGATIVE_IDS)
const SPECIAL_TYPES = typesOf(SPECIAL_IDS)
const PASS_TYPES = typesOf(PASS_IDS)
const TWO_PLAYER_TYPES = POSITIVE_TYPES.concat(NEGATIVE_TYPES, PASS_TYPES)

function uid() {
  return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10)
}

function buildRow(key, cls, types, playerName, count, threeMode) {
  return {
    key: key,
    cls: cls,
    types: types.map(function (type) {
      const delta = scoreDelta(type.id, count, type.delta, threeMode)
      return {
        id: type.id,
        lines: (type.buttonLabel || type.label).split('\n'),
        deltaText: formatDelta(delta),
        cls: delta >= 0 ? 'plus' : 'minus',
        aria:
          (playerName || '玩家') +
          ' ' +
          type.label +
          (delta >= 0 ? ' 加 ' : ' 减 ') +
          Math.abs(delta) +
          ' 分',
      }
    }),
  }
}

Page({
  data: {
    loading: true,
    notFound: false,
    count: 2,
    players: [],
    showThreeMode: false,
    threeModeLabel: '',
    statusText: '',
    hasActions: false,
    statsOpen: false,
    statsTab: 'diff',
    stats: null,
    detail: [],
    resetOpen: false,
  },

  onLoad(query) {
    this.matchId = (query && query.id) || ''
    this.match = null
    this.reload()
  },

  onShow() {
    if (this.matchId && !this.data.loading) this.reload()
  },

  reload() {
    if (!this.matchId) {
      this.setData({ loading: false, notFound: true })
      return
    }
    const match = store.loadMatch(this.matchId)
    if (!match) {
      this.match = null
      this.setData({ loading: false, notFound: true })
      return
    }
    this.match = match
    this.setData({ loading: false, notFound: false })
    this.render()
  },

  render() {
    const match = this.match
    if (!match) return

    const count = match.players.length
    const threeMode = match.threeMode || 'all'
    const scores = summary.computeScores(match)
    const counts = summary.computeCounts(match)

    const players = match.players.map(function (player, index) {
      const name = player.name || '玩家' + (index + 1)
      const rows = [
        buildRow('positive', 'score-row', POSITIVE_TYPES, name, count, threeMode),
        buildRow('negative', 'score-row', NEGATIVE_TYPES, name, count, threeMode),
      ]
      if (count === 2) {
        rows.push(buildRow('pass', 'score-row', PASS_TYPES, name, count, threeMode))
      } else {
        rows.push(buildRow('special', 'score-row special', SPECIAL_TYPES, name, count, threeMode))
      }
      const score = scores[player.id] || 0
      return {
        id: player.id,
        index: index,
        name: player.name,
        accent: ACCENTS[index % ACCENTS.length],
        score: score,
        scoreClass: score < 0 ? 'is-negative' : '',
        rows: rows,
      }
    })

    const standings = summary.buildStandings(match, scores)
    const last = match.actions[match.actions.length - 1]
    let statusText = ''
    if (last) {
      const parts = []
      const actor = match.players.filter(function (player) {
        return player.id === last.playerId
      })[0]
      const label = SCORE_TYPE_BY_ID[last.typeId] ? SCORE_TYPE_BY_ID[last.typeId].label : '记分'
      const transfers = actionTransfers(last)
      const selfDelta = transfers.filter(function (item) {
        return item.playerId === last.playerId
      })[0]
      const delta = selfDelta ? selfDelta.delta : last.delta || 0
      parts.push((actor ? actor.name || '玩家' : '玩家') + ' · ' + label + ' ' + formatDelta(delta))
      transfers.forEach(function (item) {
        if (item.playerId === last.playerId) return
        const target = match.players.filter(function (player) {
          return player.id === item.playerId
        })[0]
        parts.push((target ? target.name || '玩家' : '玩家') + ' ' + formatDelta(item.delta))
      })
      statusText = '上一步：' + parts.join(' · ')
    } else if (count === 3) {
      statusText = threeMode === 'upper' ? '点当事人的按钮，只和上家结算' : '点当事人的按钮，另外两家自动结算'
    } else {
      statusText = '点下面的按钮开始记分'
    }

    this.setData({
      count: count,
      players: players,
      showThreeMode: count === 3,
      threeModeLabel: threeMode === 'upper' ? '只赔上家' : '通赔',
      statusText: statusText,
      hasActions: match.actions.length > 0,
      stats: this.buildStats(match, standings, scores, counts),
      detail: this.buildDetail(match, counts),
    })
  },

  buildStats(match, standings, scores, counts) {
    const verdict = summary.buildVerdict(match, standings)
    const rows = standings.map(function (row, rank) {
      const gap = summary.scoreGap(standings, row.player.id)
      return {
        id: row.player.id,
        rank: rank + 1,
        name: summary.nameOf(row),
        accent: ACCENTS[row.index % ACCENTS.length],
        score: row.score,
        gapText: gap > 0 ? '+' + gap : String(gap),
        gapClass: gap > 0 ? 'is-plus' : gap < 0 ? 'is-minus' : '',
      }
    })
    return {
      verdictText: verdict.text,
      verdictNeutral: verdict.neutral,
      verdictSub: verdict.sub,
      rows: rows,
      note:
        match.players.length === 3
          ? '分差 = 与另外两人的两两分差之和，三人合计为 0'
          : '分差 = 本人分数 − 其他玩家平均分',
      tips: summary.buildSuggestions(match, counts, scores),
    }
  },

  buildDetail(match, counts) {
    const types = match.players.length === 3 ? SCORE_TYPES : TWO_PLAYER_TYPES
    return match.players.map(function (player, index) {
      const per = counts[player.id] || {}
      let total = 0
      Object.keys(per).forEach(function (typeId) {
        total += per[typeId]
      })
      return {
        id: player.id,
        name: (player.name || '').trim() || '玩家' + (index + 1),
        accent: ACCENTS[index % ACCENTS.length],
        total: total,
        cells: types.map(function (type) {
          const value = per[type.id] || 0
          return { id: type.id, label: type.label, count: value, zero: value === 0 }
        }),
      }
    })
  },

  onScore(event) {
    if (!this.match) return
    const dataset = event.currentTarget.dataset
    const playerId = dataset.player
    const typeId = dataset.type
    const type = SCORE_TYPE_BY_ID[typeId]
    if (!type) return

    const count = this.match.players.length
    const threeMode = this.match.threeMode || 'all'
    const transfers = buildTransfers(this.match.players, playerId, typeId, threeMode)
    const selfTransfer = transfers
      ? transfers.filter(function (item) {
          return item.playerId === playerId
        })[0]
      : undefined

    const action = {
      id: uid(),
      playerId: playerId,
      typeId: typeId,
      delta: selfTransfer ? selfTransfer.delta : type.delta,
      at: Date.now(),
    }
    if (transfers) action.transfers = transfers

    try {
      this.match = store.addAction(this.matchId, action)
      this.render()
    } catch (error) {
      wx.showToast({ title: '记分失败，请重试', icon: 'none' })
    }
  },

  onUndo() {
    if (!this.match || this.match.actions.length === 0) return
    try {
      this.match = store.undoLast(this.matchId)
      this.render()
      wx.showToast({ title: '已撤销上一笔', icon: 'none' })
    } catch (error) {
      wx.showToast({ title: '撤销失败，请重试', icon: 'none' })
    }
  },

  onResetTap() {
    if (!this.match || this.match.actions.length === 0) return
    this.setData({ resetOpen: true })
  },

  onResetCancel() {
    this.setData({ resetOpen: false })
  },

  onResetConfirm() {
    this.setData({ resetOpen: false })
    if (!this.match) return
    try {
      this.match = store.clearActions(this.matchId)
      this.render()
      wx.showToast({ title: '已重置', icon: 'none' })
    } catch (error) {
      wx.showToast({ title: '重置失败，请重试', icon: 'none' })
    }
  },

  onNameInput(event) {
    if (!this.match) return
    const playerId = event.currentTarget.dataset.id
    const player = this.match.players.filter(function (item) {
      return item.id === playerId
    })[0]
    if (!player) return
    player.name = event.detail.value
    try {
      store.renamePlayer(this.matchId, playerId, player.name)
    } catch (error) {
      // 名字保存失败不影响计分，失焦时会再尝试一次
    }
  },

  onNameBlur(event) {
    if (!this.match) return
    const dataset = event.currentTarget.dataset
    const playerId = dataset.id
    const index = Number(dataset.index)
    const name = (event.detail.value || '').trim() || '玩家' + (index + 1)
    const player = this.match.players.filter(function (item) {
      return item.id === playerId
    })[0]
    if (player) player.name = name
    try {
      this.match = store.renamePlayer(this.matchId, playerId, name)
    } catch (error) {
      wx.showToast({ title: '名字没保存成功', icon: 'none' })
    }
    this.render()
  },

  onStatsOpen() {
    this.setData({ statsOpen: true, statsTab: 'diff' })
  },

  onStatsTab(event) {
    const tab = event.currentTarget.dataset.tab
    if (tab !== 'diff' && tab !== 'detail') return
    this.setData({ statsTab: tab })
  },

  onStatsClose() {
    this.setData({ statsOpen: false })
  },

  onBack() {
    if (getCurrentPages().length > 1) {
      wx.navigateBack()
      return
    }
    wx.reLaunch({ url: '/pages/home/home' })
  },

  noop() {},
})
