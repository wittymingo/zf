// 计分项定义，与网页版 src/types.ts 保持一致
const SCORE_TYPES = [
  { id: 'bigGold', label: '大金', delta: 10 },
  { id: 'smallGold', label: '小金', delta: 7 },
  { id: 'goldNine', label: '黄金9', delta: 4 },
  { id: 'normalWin', label: '普胜', delta: 4 },
  { id: 'foul', label: '犯规', delta: -1 },
  { id: 'normalBlack', label: '普黑金', delta: -4 },
  { id: 'smallBlack', label: '小黑金', delta: -7 },
  { id: 'bigBlack', label: '大黑金', delta: -10 },
  { id: 'goldNineBlack', label: '黄金9黑金', delta: -8, buttonLabel: '黄金9\n黑金' },
  { id: 'freeNineBlack', label: '自由球9黑金', delta: -4, buttonLabel: '自由球9\n黑金' },
  { id: 'passFail', label: '让杆解球失败', delta: -1, buttonLabel: '让杆解球\n失败' },
  { id: 'passWin', label: '让杆普胜', delta: 8 },
  { id: 'passSmallGold', label: '让杆小金', delta: 14 },
  { id: 'passBigGold', label: '让杆大金', delta: 20 },
]

const SCORE_TYPE_BY_ID = {}
SCORE_TYPES.forEach(function (type) {
  SCORE_TYPE_BY_ID[type.id] = type
})

// 未记录联动明细时退化为只结算点击者
function actionTransfers(action) {
  if (action.transfers && action.transfers.length > 0) return action.transfers
  return [{ playerId: action.playerId, delta: action.delta }]
}

function formatDelta(delta) {
  return delta > 0 ? '+' + delta : String(delta)
}

module.exports = {
  SCORE_TYPES: SCORE_TYPES,
  SCORE_TYPE_BY_ID: SCORE_TYPE_BY_ID,
  actionTransfers: actionTransfers,
  formatDelta: formatDelta,
}
