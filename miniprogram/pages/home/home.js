const store = require('../../utils/store')

const THREE_MODES = {
  all: '大金、黄金9、大黑金、黄金9黑金由另外两家各赔一份。',
  upper: '以上四项只由上一家赔单人份，另外一家不参与结算。',
}

Page({
  data: {
    playerCount: 2,
    threeMode: 'all',
    threeModeHint: THREE_MODES.all,
    nameHint: '两人局各自加减分：另有 4 个让杆项，点谁的卡片就只改谁的分。',
    names: ['玩家1', '玩家2'],
    lastMatch: null,
  },

  onShow() {
    this.setData({ lastMatch: store.loadLastMatchMeta() })
  },

  onChooseCount(event) {
    const playerCount = Number(event.currentTarget.dataset.count)
    if (!playerCount || playerCount === this.data.playerCount) return
    const names = []
    for (let index = 0; index < playerCount; index += 1) {
      names.push(this.data.names[index] || '玩家' + (index + 1))
    }
    this.setData({
      playerCount: playerCount,
      names: names,
      nameHint:
        playerCount === 3
          ? '按填写顺序循环：前一位是上家，后一位是下家。点当事人的按钮，由系统自动结算。'
          : '两人局各自加减分：另有 4 个让杆项，点谁的卡片就只改谁的分。',
    })
  },

  onChooseMode(event) {
    const threeMode = event.currentTarget.dataset.mode
    if (threeMode !== 'all' && threeMode !== 'upper') return
    this.setData({ threeMode: threeMode, threeModeHint: THREE_MODES[threeMode] })
  },

  onNameInput(event) {
    const index = Number(event.currentTarget.dataset.index)
    const names = this.data.names.slice()
    names[index] = event.detail.value
    this.setData({ names: names })
  },

  onStart() {
    const lastMatch = this.data.lastMatch
    if (lastMatch && lastMatch.actionCount > 0) {
      wx.showModal({
        title: '覆盖当前这局？',
        content: '本机只保存一局，新开一局会覆盖上一局的分数。',
        confirmText: '开新局',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) this.startMatch()
        },
      })
      return
    }
    this.startMatch()
  },

  startMatch() {
    const names = []
    for (let index = 0; index < this.data.playerCount; index += 1) {
      const raw = (this.data.names[index] || '').trim()
      names.push(raw || '玩家' + (index + 1))
    }
    const match = store.createMatch(names, this.data.threeMode)
    wx.navigateTo({ url: '/pages/match/match?id=' + match.id })
  },

  onContinue() {
    const lastMatch = this.data.lastMatch
    if (!lastMatch) return
    wx.navigateTo({ url: '/pages/match/match?id=' + lastMatch.id })
  },
})
