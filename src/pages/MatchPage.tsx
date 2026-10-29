import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { useMatch } from '../hooks/useMatch'
import { buildTransfers, scoreDelta } from '../rules'
import { actionTransfers, SCORE_TYPES, SCORE_TYPE_BY_ID, formatDelta } from '../types'
import type { Player, ScoreType, ScoreTypeId } from '../types'

interface MatchPageProps {
  matchId: string
  sharedMode: boolean
  onExit: () => void
}

const ACCENTS = ['#0f7a55', '#c9871f', '#3b74c7', '#b0487a']

const CORE_POSITIVE_IDS: readonly ScoreTypeId[] = ['bigGold', 'smallGold', 'goldNine', 'normalWin']
const CORE_NEGATIVE_IDS: readonly ScoreTypeId[] = ['foul', 'normalBlack', 'smallBlack', 'bigBlack']
const SPECIAL_IDS: readonly ScoreTypeId[] = [
  'goldNineBlack',
  'freeNineBlack',
  'passFail',
  'passWin',
  'passSmallGold',
  'passBigGold',
]
const PASS_IDS: readonly ScoreTypeId[] = ['passFail', 'passWin', 'passSmallGold', 'passBigGold']

function typesByIds(ids: readonly ScoreTypeId[]): ScoreType[] {
  return ids
    .map((id) => SCORE_TYPE_BY_ID.get(id))
    .filter((type): type is ScoreType => Boolean(type))
}

const POSITIVE_TYPES = typesByIds(CORE_POSITIVE_IDS)
const NEGATIVE_TYPES = typesByIds(CORE_NEGATIVE_IDS)
const SPECIAL_TYPES = typesByIds(SPECIAL_IDS)
const PASS_TYPES = typesByIds(PASS_IDS)
const CORE_TYPES = [...POSITIVE_TYPES, ...NEGATIVE_TYPES]
const TWO_PLAYER_TYPES = [...CORE_TYPES, ...PASS_TYPES]

const SYNC_LABEL: Record<string, string> = {
  live: '实时同步正常',
  connecting: '正在连接…',
  offline: '连接已断开，正在重连',
}

export function MatchPage({ matchId, sharedMode, onExit }: MatchPageProps) {
  const { match, loading, notFound, error, syncState, addScore, undo, reset, renamePlayer, retry } =
    useMatch(matchId)
  const [shareOpen, setShareOpen] = useState(false)
  const [statsOpen, setStatsOpen] = useState(false)
  const [statsTab, setStatsTab] = useState<'diff' | 'detail'>('diff')
  const [resetOpen, setResetOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const shareInputRef = useRef<HTMLInputElement>(null)

  const shareUrl = `${window.location.origin}${window.location.pathname}?match=${matchId}`

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 2400)
    return () => window.clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    if (!shareOpen) return
    shareInputRef.current?.focus()
    shareInputRef.current?.select()
  }, [shareOpen])

  const scores = useMemo(() => {
    const map = new Map<string, number>()
    if (match) {
      for (const player of match.players) map.set(player.id, 0)
      for (const action of match.actions) {
        for (const transfer of actionTransfers(action)) {
          if (!map.has(transfer.playerId)) continue
          map.set(transfer.playerId, (map.get(transfer.playerId) ?? 0) + transfer.delta)
        }
      }
    }
    return map
  }, [match])

  const counts = useMemo(() => {
    const map = new Map<string, Map<string, number>>()
    if (match) {
      for (const player of match.players) map.set(player.id, new Map())
      for (const action of match.actions) {
        const perType = map.get(action.playerId)
        if (!perType) continue
        perType.set(action.typeId, (perType.get(action.typeId) ?? 0) + 1)
      }
    }
    return map
  }, [match])

  const standings = useMemo(() => {
    if (!match) return []
    return match.players
      .map((player, index) => ({ player, index, score: scores.get(player.id) ?? 0 }))
      .sort((a, b) => b.score - a.score)
  }, [match, scores])

  const scoreTotal = standings.reduce((sum, row) => sum + row.score, 0)

  // 3 人按两两对账：本人与另外两人的分差之和，三人合计恒为 0
  const scoreGap = (playerId: string) => {
    if (standings.length <= 1) return 0
    const me = standings.find((row) => row.player.id === playerId)
    if (!me) return 0
    if (standings.length === 3) {
      return standings.reduce(
        (sum, row) => (row.player.id === playerId ? sum : sum + (me.score - row.score)),
        0,
      )
    }
    return Math.round((me.score - (scoreTotal - me.score) / (standings.length - 1)) * 10) / 10
  }

  function totalCount(playerId: string): number {
    let total = 0
    for (const count of counts.get(playerId)?.values() ?? []) total += count
    return total
  }

  async function handleShare() {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setToast('链接已复制，发给朋友就能一起记分')
    } catch {
      setShareOpen(true)
    }
  }

  async function copyFromDialog() {
    shareInputRef.current?.focus()
    shareInputRef.current?.select()
    try {
      await navigator.clipboard.writeText(shareUrl)
      setToast('链接已复制')
      setShareOpen(false)
      return
    } catch {
      // 微信等内置浏览器可能禁用 clipboard，退回到选区复制
    }
    try {
      const copied = document.execCommand('copy')
      if (copied) {
        setToast('链接已复制')
        setShareOpen(false)
        return
      }
    } catch {
      // ignore
    }
    setToast('复制失败，请长按链接手动复制')
  }

  if (loading) {
    return (
      <div className="center-state">
        <p>正在载入对局…</p>
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="center-state">
        <h1>对局不存在</h1>
        <p>链接可能已失效，回首页开一局新的。</p>
        <button type="button" className="primary-btn" onClick={onExit}>
          返回首页
        </button>
      </div>
    )
  }

  if (!match) {
    return (
      <div className="center-state">
        <p>对局加载失败。</p>
        <button type="button" className="primary-btn" onClick={() => void retry()}>
          重试
        </button>
        <button type="button" className="line-btn" onClick={onExit}>
          返回首页
        </button>
      </div>
    )
  }

  const lastAction = match.actions[match.actions.length - 1]
  const threeMode = match.threeMode ?? 'all'
  const threeModeLabel = threeMode === 'upper' ? '只赔上家' : '通赔'
  const lastActionTransfers = lastAction ? actionTransfers(lastAction) : []
  const lastActionDelta =
    lastActionTransfers.find((item) => item.playerId === lastAction?.playerId)?.delta ??
    lastAction?.delta ??
    0
  const lastActionText = lastAction
    ? [
        `${match.players.find((player) => player.id === lastAction.playerId)?.name || '玩家'} · ${
          SCORE_TYPE_BY_ID.get(lastAction.typeId)?.label ?? '记分'
        } ${formatDelta(lastActionDelta)}`,
        ...lastActionTransfers
          .filter((item) => item.playerId !== lastAction.playerId)
          .map(
            (item) =>
              `${match.players.find((player) => player.id === item.playerId)?.name || '玩家'} ${formatDelta(item.delta)}`,
          ),
      ].join(' · ')
    : ''

  return (
    <div className="match">
      <header className="topbar">
        <button type="button" className="icon-btn" onClick={onExit} aria-label="返回首页">
          ←
        </button>
        <div className="brand">
          {sharedMode && (
            <span
              className={`sync-dot ${syncState}`}
              title={SYNC_LABEL[syncState]}
              aria-label={SYNC_LABEL[syncState]}
            />
          )}
          <span className="brand-text">追分台球</span>
        </div>
        <div className="topbar-actions">
          {sharedMode && (
            <button type="button" className="action-btn" onClick={() => void handleShare()}>
              分享
            </button>
          )}
          <button
            type="button"
            className="action-btn"
            onClick={() => {
              setStatsTab('diff')
              setStatsOpen(true)
            }}
          >
            统计
          </button>
          <button
            type="button"
            className="action-btn danger"
            onClick={() => setResetOpen(true)}
            disabled={match.actions.length === 0}
          >
            重置
          </button>
          <button
            type="button"
            className="action-btn"
            onClick={undo}
            disabled={match.actions.length === 0}
          >
            撤销
          </button>
        </div>
      </header>

      {sharedMode && syncState === 'offline' && (
        <div className="banner banner-warn">
          <span>实时连接已断开，分数可能不是最新。</span>
          <button type="button" onClick={() => void retry()}>
            重试
          </button>
        </div>
      )}

      {error && (
        <div className="banner banner-error">
          <span>{error}</span>
          <button type="button" onClick={() => void retry()}>
            重试
          </button>
        </div>
      )}

      <p className="status-line" aria-live="polite">
        {match.players.length === 3 && <span className="status-mode">{threeModeLabel}</span>}
        <span className="status-text">
          {lastAction
            ? `上一步：${lastActionText}`
            : match.players.length === 3
              ? threeMode === 'upper'
                ? '点当事人的按钮，只和上家结算'
                : '点当事人的按钮，另外两家自动结算'
              : '点下面的按钮开始记分'}
        </span>
      </p>

      <div className="board" data-count={match.players.length}>
        {match.players.map((player, index) => {
          const score = scores.get(player.id) ?? 0
          const scoreButton = (type: ScoreType) => {
            const delta = scoreDelta(type.id, match.players.length, type.delta, threeMode)
            const isPlus = delta >= 0
            const transfers = buildTransfers(match.players, player.id, type.id, threeMode)
            const detail = transfers
              ?.map(
                (item) =>
                  `${match.players.find((entry) => entry.id === item.playerId)?.name || '玩家'} ${formatDelta(item.delta)}`,
              )
              .join('，')
            return (
              <button
                key={type.id}
                type="button"
                className={`score-btn ${isPlus ? 'plus' : 'minus'}`}
                title={detail}
                onClick={() => addScore(player.id, type, transfers)}
                aria-label={`${player.name || '玩家'} ${type.label} ${isPlus ? '加' : '减'} ${Math.abs(delta)} 分`}
              >
                <span className="label">{type.buttonLabel ?? type.label}</span>
                <span className="delta">{formatDelta(delta)}</span>
              </button>
            )
          }
          return (
            <section
              key={player.id}
              className="player"
              style={{ '--accent': ACCENTS[index % ACCENTS.length] } as CSSProperties}
            >
              <div className="player-head">
                <div className="player-id">
                  <span className="accent-dot" aria-hidden="true" />
                  <input
                    className="player-name"
                    value={player.name}
                    maxLength={12}
                    aria-label={`第 ${index + 1} 位玩家昵称`}
                    onChange={(event) => renamePlayer(player.id, event.target.value)}
                    onBlur={() => {
                      if (!player.name.trim()) renamePlayer(player.id, `玩家${index + 1}`)
                    }}
                  />
                </div>
                <div
                  className={`score${score < 0 ? ' is-negative' : ''}`}
                  aria-live="polite"
                  aria-atomic="true"
                >
                  <span key={score}>{score}</span>
                </div>
              </div>

              <div className="score-rows">
                <div className="score-row" role="group" aria-label={`${player.name || '玩家'} 加分项`}>
                  {POSITIVE_TYPES.map((type) => scoreButton(type))}
                </div>

                <div className="score-row" role="group" aria-label={`${player.name || '玩家'} 减分项`}>
                  {NEGATIVE_TYPES.map((type) => scoreButton(type))}
                </div>

                {match.players.length === 2 && (
                  <div
                    className="score-row"
                    role="group"
                    aria-label={`${player.name || '玩家'} 让杆项`}
                    title="两人局点谁的卡片就只加减谁的分"
                  >
                    {PASS_TYPES.map((type) => scoreButton(type))}
                  </div>
                )}

                {match.players.length === 3 && (
                  <div
                    className="score-row special"
                    role="group"
                    aria-label={`${player.name || '玩家'} 三人追分特例项，让杆类按钮点在解球方的卡片上`}
                    title="让杆类按钮点在解球方的卡片上"
                  >
                    {SPECIAL_TYPES.map((type) => scoreButton(type))}
                  </div>
                )}
              </div>
            </section>
          )
        })}
      </div>

      {shareOpen && (
        <div
          className="modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="share-title"
          onClick={(event) => {
            if (event.target === event.currentTarget) setShareOpen(false)
          }}
        >
          <div className="modal-card">
            <h2 id="share-title">分享这局</h2>
            <p>朋友打开链接就能一起记分，分数实时同步；拿到链接的人都能改分。</p>
            <input
              ref={shareInputRef}
              className="modal-input"
              readOnly
              value={shareUrl}
              onFocus={(event) => event.currentTarget.select()}
            />
            <div className="modal-actions">
              <button type="button" className="line-btn" onClick={() => setShareOpen(false)}>
                关闭
              </button>
              <button type="button" className="primary-btn" onClick={() => void copyFromDialog()}>
                复制链接
              </button>
            </div>
          </div>
        </div>
      )}

      {statsOpen && (
        <div
          className="modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="stats-title"
          onClick={(event) => {
            if (event.target === event.currentTarget) setStatsOpen(false)
          }}
        >
          <div className="modal-card stats-card">
            <h2 id="stats-title">本局统计</h2>
            <div className="stats-tabs" role="tablist" aria-label="统计视图">
              <button
                type="button"
                role="tab"
                aria-selected={statsTab === 'diff'}
                onClick={() => setStatsTab('diff')}
              >
                比分差
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={statsTab === 'detail'}
                onClick={() => setStatsTab('detail')}
              >
                击球统计
              </button>
            </div>

            <div className="stats-panel" role="tabpanel">
              {statsTab === 'diff' ? (
                <>
                  <p
                    className={`verdict${
                      match.actions.length > 0 &&
                      standings.filter((row) => row.score === standings[0].score).length === 1
                        ? ''
                        : ' is-neutral'
                    }`}
                  >
                    {match.actions.length === 0
                      ? '还没有记分，先打几杆吧'
                      : standings.filter((row) => row.score === standings[0].score).length > 1
                        ? `${standings
                            .filter((row) => row.score === standings[0].score)
                            .map((row) => row.player.name || `玩家${row.index + 1}`)
                            .join('、')} 暂时并列第一`
                        : `恭喜 ${standings[0].player.name || `玩家${standings[0].index + 1}`}，赢下比赛`}
                  </p>

                  {match.actions.length > 0 &&
                    standings.length > 1 &&
                    standings.filter((row) => row.score === standings[0].score).length === 1 && (
                      <p className="verdict-sub">
                        领先第二名 {standings[0].score - standings[1].score} 分
                      </p>
                    )}

                  <div className="diff-list">
                    {standings.map((row, rank) => {
                      const gap = scoreGap(row.player.id)
                      return (
                        <div
                          className="diff-row"
                          key={row.player.id}
                          style={
                            { '--accent': ACCENTS[row.index % ACCENTS.length] } as CSSProperties
                          }
                        >
                          <span className="diff-rank">{rank + 1}</span>
                          <span className="accent-dot" aria-hidden="true" />
                          <span className="diff-name">
                            {row.player.name || `玩家${row.index + 1}`}
                          </span>
                          <span className="diff-score">{row.score} 分</span>
                          <span
                            className={`diff-value${
                              gap > 0 ? ' is-plus' : gap < 0 ? ' is-minus' : ''
                            }`}
                          >
                            {gap > 0 ? `+${gap}` : gap}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                  <p className="stats-note diff-note">
                    {match.players.length === 3
                      ? '分差 = 与另外两人的两两分差之和，三人合计为 0'
                      : '分差 = 本人分数 − 其他玩家平均分'}
                  </p>

                  <h3 className="tip-title">台球建议</h3>
                  <ul className="tip-list">
                    {buildSuggestions(match.players, counts, scores, match.actions.length > 0).map((tip) => (
                      <li key={tip}>{tip}</li>
                    ))}
                  </ul>
                </>
              ) : (
                <>
                  <p className="stats-note">每个计分项被点击的次数，随记分实时更新。</p>
                  <div className="stats-list">
                    {match.players.map((player, index) => (
                      <section
                        key={player.id}
                        className="stats-player"
                        style={{ '--accent': ACCENTS[index % ACCENTS.length] } as CSSProperties}
                      >
                        <div className="stats-head">
                          <span className="accent-dot" aria-hidden="true" />
                          <span className="stats-name">{player.name || `玩家${index + 1}`}</span>
                          <span className="stats-total">{totalCount(player.id)} 杆</span>
                        </div>
                        <div className="stats-grid">
                          {(match.players.length === 3 ? SCORE_TYPES : TWO_PLAYER_TYPES).map((type) => {
                            const count = counts.get(player.id)?.get(type.id) ?? 0
                            return (
                              <div className="stat-cell" key={type.id}>
                                <span className="stat-label">{type.label}</span>
                                <span
                                  className={`stat-count${count === 0 ? ' is-zero' : ''}`}
                                >
                                  {count}
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      </section>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="modal-actions">
              <button type="button" className="line-btn" onClick={() => setStatsOpen(false)}>
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {resetOpen && (
        <div
          className="modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reset-title"
          onClick={(event) => {
            if (event.target === event.currentTarget) setResetOpen(false)
          }}
        >
          <div className="modal-card">
            <h2 id="reset-title">重新开始？</h2>
            <p>会清空这局所有分数和统计次数，从 0 开始。清空后无法撤销恢复。</p>
            <div className="modal-actions">
              <button type="button" className="line-btn" onClick={() => setResetOpen(false)}>
                取消
              </button>
              <button
                type="button"
                className="danger-btn"
                onClick={() => {
                  reset()
                  setResetOpen(false)
                  setToast('已重置，本局从 0 开始')
                }}
              >
                确定重置
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </div>
  )
}

function buildSuggestions(
  players: Player[],
  counts: Map<string, Map<string, number>>,
  scores: Map<string, number>,
  hasActions: boolean,
): string[] {
  if (!hasActions) {
    return ['先记几笔分数，这里会结合大金、黑金和犯规次数给出针对性建议。']
  }

  const nameOf = (player: Player, index: number) => player.name.trim() || `玩家${index + 1}`
  const countOf = (playerId: string, ids: string[]) =>
    ids.reduce((total, id) => total + (counts.get(playerId)?.get(id) ?? 0), 0)
  const leaderOf = (ids: string[]) =>
    players
      .map((player, index) => ({ name: nameOf(player, index), n: countOf(player.id, ids) }))
      .sort((a, b) => b.n - a.n)[0]

  const tips: string[] = []
  const fouls = leaderOf(['foul'])
  if (fouls && fouls.n >= 2) {
    tips.push(`${fouls.name} 已犯规 ${fouls.n} 次，母球控制建议更保守，关键球优先做安全球。`)
  }
  const blacks = leaderOf([
    'normalBlack',
    'smallBlack',
    'bigBlack',
    'goldNineBlack',
    'freeNineBlack',
  ])
  if (blacks && blacks.n >= 2) {
    tips.push(`${blacks.name} 出现 ${blacks.n} 次黑金，贴库球和袋口球别硬拼，及时转防守。`)
  }
  const golds = leaderOf(['bigGold', 'smallGold'])
  if (golds && golds.n >= 2) {
    tips.push(`${golds.name} 大金/小金共 ${golds.n} 次，开球和连续清台手感在线，保持进攻节奏。`)
  }
  const goldNines = leaderOf(['goldNine'])
  if (goldNines && goldNines.n >= 2 && tips.length < 3) {
    tips.push(`${goldNines.name} 黄金9 打成 ${goldNines.n} 次，9 号球的走位和收尾可以继续保持。`)
  }

  if (tips.length < 3) {
    const ranked = [...scores.values()].sort((a, b) => b - a)
    if (ranked.length > 1) {
      const lead = ranked[0] - ranked[1]
      if (lead <= 5) {
        tips.push('分差很小，接下来一次犯规或黑金就可能改变结果，优先稳住母球。')
      } else if (lead >= 15) {
        tips.push('分差已经拉开，领先方放慢节奏，落后方多尝试主动进攻。')
      }
    }
  }

  for (const tip of [
    '开球前先确认母球落点，减少白球摔袋和无谓犯规。',
    '中局优先处理难点球，进攻不顺时及时转防守。',
  ]) {
    if (tips.length >= 3) break
    tips.push(tip)
  }

  return tips.slice(0, 3)
}
