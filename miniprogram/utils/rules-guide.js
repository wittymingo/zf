// 玩法说明数据：直接复用计分引擎的规则表，规则调整后说明自动同步。
const { SCORE_TYPES } = require('./types')
const { THREE_PLAYER_ALL_RULES, THREE_PLAYER_UPPER_RULES } = require('./rules')

// 两人模式不提供黄金9黑金 / 自由球9黑金，与计分页按钮一致
const TWO_PLAYER_IDS = [
  'bigGold',
  'smallGold',
  'goldNine',
  'normalWin',
  'foul',
  'normalBlack',
  'smallBlack',
  'bigBlack',
  'passFail',
  'passWin',
  'passSmallGold',
  'passBigGold',
]

const SEATS = ['self', 'upper', 'lower']

function rowOf(type, parts) {
  const row = { id: type.id, label: type.label, self: null, upper: null, lower: null }
  parts.forEach(function (part) {
    row[part.seat] = part.delta
  })
  return row
}

function cellsOf(row) {
  return SEATS.map(function (seat) {
    const delta = row[seat]
    return {
      seat: seat,
      text: delta === null ? '—' : delta > 0 ? '+' + delta : String(delta),
      tone: delta === null ? 'rules-none' : delta > 0 ? 'rules-plus' : delta < 0 ? 'rules-minus' : '',
    }
  })
}

function withCells(row) {
  return { id: row.id, label: row.label, cells: cellsOf(row) }
}

function rowsFromRules(rules) {
  return SCORE_TYPES.map(function (type) {
    return rowOf(type, rules[type.id])
  })
}

function sameRow(a, b) {
  return a.self === b.self && a.upper === b.upper && a.lower === b.lower
}

const twoPlayerRows = TWO_PLAYER_IDS.map(function (id) {
  const type = SCORE_TYPES.find(function (item) {
    return item.id === id
  })
  return withCells(rowOf(type, [{ seat: 'self', delta: type.delta }]))
})

const threeAllRows = rowsFromRules(THREE_PLAYER_ALL_RULES)
const threeUpperRows = rowsFromRules(THREE_PLAYER_UPPER_RULES)
const threeUpperDiffRows = threeUpperRows.filter(function (row, index) {
  return !sameRow(row, threeAllRows[index])
})

module.exports = {
  TWO_PLAYER_ROWS: twoPlayerRows,
  THREE_ALL_ROWS: threeAllRows.map(withCells),
  THREE_UPPER_DIFF_ROWS: threeUpperDiffRows.map(withCells),
  THREE_SAME_COUNT: threeAllRows.length - threeUpperDiffRows.length,
}
