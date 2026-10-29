// 本地存储版：一台手机只保存一局，与网页版本地模式行为一致
const MATCH_KEY = 'zhuifen.match.v1'
const LAST_MATCH_KEY = 'zhuifen.lastMatch.v1'

function uid() {
  return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10)
}

function readRaw(key) {
  try {
    const raw = wx.getStorageSync(key)
    if (!raw) return null
    return typeof raw === 'string' ? JSON.parse(raw) : raw
  } catch (error) {
    return null
  }
}

function writeRaw(key, value) {
  try {
    wx.setStorageSync(key, JSON.stringify(value))
  } catch (error) {
    // 存储已满时静默降级，页面仍可正常计分
  }
}

function isMatch(value) {
  if (!value || typeof value !== 'object') return false
  const players = value.players
  const actions = value.actions

  if (typeof value.id !== 'string') return false
  if (!Array.isArray(players) || players.length === 0) return false
  if (!Array.isArray(actions)) return false
  if (value.threeMode !== undefined && value.threeMode !== 'all' && value.threeMode !== 'upper') {
    return false
  }

  const playersOk = players.every(function (player) {
    return player && typeof player.id === 'string' && typeof player.name === 'string'
  })
  if (!playersOk) return false

  const playerIds = {}
  players.forEach(function (player) {
    playerIds[player.id] = true
  })

  return actions.every(function (action) {
    if (!action || typeof action.playerId !== 'string' || !playerIds[action.playerId]) return false
    if (typeof action.delta !== 'number' || !isFinite(action.delta)) return false
    if (action.transfers === undefined) return true
    if (!Array.isArray(action.transfers)) return false
    return action.transfers.every(function (transfer) {
      return (
        transfer &&
        typeof transfer.playerId === 'string' &&
        playerIds[transfer.playerId] &&
        typeof transfer.delta === 'number' &&
        isFinite(transfer.delta)
      )
    })
  })
}

function loadMatch(matchId) {
  const match = readRaw(MATCH_KEY)
  if (!isMatch(match)) return null
  return match.id === matchId ? match : null
}

function saveMatch(match) {
  writeRaw(MATCH_KEY, match)
  saveLastMatchMeta(match)
}

function createMatch(playerNames, threeMode) {
  const now = Date.now()
  const players = playerNames.map(function (name, index) {
    const trimmed = (name || '').trim()
    return { id: uid(), name: trimmed || '玩家' + (index + 1) }
  })
  const match = {
    id: uid(),
    createdAt: now,
    updatedAt: now,
    players: players,
    actions: [],
  }
  if (players.length === 3) match.threeMode = threeMode || 'all'
  saveMatch(match)
  return match
}

function addAction(matchId, action) {
  const match = loadMatch(matchId)
  if (!match) throw new Error('match not found')
  match.actions.push(action)
  match.updatedAt = action.at
  saveMatch(match)
  return match
}

function undoLast(matchId) {
  const match = loadMatch(matchId)
  if (!match) throw new Error('match not found')
  match.actions.pop()
  match.updatedAt = Date.now()
  saveMatch(match)
  return match
}

function clearActions(matchId) {
  const match = loadMatch(matchId)
  if (!match) throw new Error('match not found')
  match.actions = []
  match.updatedAt = Date.now()
  saveMatch(match)
  return match
}

function renamePlayer(matchId, playerId, name) {
  const match = loadMatch(matchId)
  if (!match) throw new Error('match not found')
  match.players = match.players.map(function (player) {
    return player.id === playerId ? { id: player.id, name: name } : player
  })
  match.updatedAt = Date.now()
  saveMatch(match)
  return match
}

function loadLastMatchMeta() {
  const meta = readRaw(LAST_MATCH_KEY)
  if (!meta || typeof meta !== 'object') return null
  if (typeof meta.id !== 'string' || typeof meta.playerCount !== 'number') return null
  return {
    id: meta.id,
    playerCount: meta.playerCount,
    actionCount: typeof meta.actionCount === 'number' ? meta.actionCount : 0,
    updatedAt: typeof meta.updatedAt === 'number' ? meta.updatedAt : 0,
  }
}

function saveLastMatchMeta(match) {
  writeRaw(LAST_MATCH_KEY, {
    id: match.id,
    playerCount: match.players.length,
    actionCount: match.actions.length,
    updatedAt: match.updatedAt,
  })
}

module.exports = {
  loadMatch: loadMatch,
  createMatch: createMatch,
  addAction: addAction,
  undoLast: undoLast,
  clearActions: clearActions,
  renamePlayer: renamePlayer,
  loadLastMatchMeta: loadLastMatchMeta,
  saveLastMatchMeta: saveLastMatchMeta,
  MATCH_KEY: MATCH_KEY,
}
