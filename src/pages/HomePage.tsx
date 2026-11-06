import { useRef, useState } from 'react'
import { THREE_ALL_ROWS, THREE_SAME_COUNT, THREE_UPPER_DIFF_ROWS, TWO_PLAYER_ROWS } from '../rulesGuide'
import type { GuideRow } from '../rulesGuide'
import { loadLastMatchMeta } from '../storage'
import type { LastMatchMeta } from '../storage/types'
import type { ThreeMode } from '../types'

interface HomePageProps {
  sharedMode: boolean
  starting: boolean
  startError: string | null
  onStart: (playerNames: string[], threeMode: ThreeMode) => void
  onContinue: (matchId: string) => void
}

const PLAYER_COUNTS = [2, 3]

const THREE_MODES: { id: ThreeMode; label: string; hint: string }[] = [
  {
    id: 'all',
    label: '通赔',
    hint: '大金、黄金9、大黑金、黄金9黑金由另外两家各赔一份。',
  },
  {
    id: 'upper',
    label: '只赔上家',
    hint: '以上四项只由上一家赔单人份，另外一家不参与结算。',
  },
]

function formatCell(value: number | null): string {
  if (value === null) return '—'
  return value > 0 ? `+${value}` : String(value)
}

function cellClass(value: number | null): string {
  if (value === null) return 'rules-cell rules-none'
  if (value > 0) return 'rules-cell rules-plus'
  if (value < 0) return 'rules-cell rules-minus'
  return 'rules-cell'
}

function RulesTable({ rows, threePlayer = false }: { rows: GuideRow[]; threePlayer?: boolean }) {
  return (
    <div className={`rules-table${threePlayer ? '' : ' is-two'}`}>
      <div className="rules-row rules-row-head">
        <span className="rules-cell is-name">项目</span>
        <span className="rules-cell">本人</span>
        {threePlayer && <span className="rules-cell">上家</span>}
        {threePlayer && <span className="rules-cell">下家</span>}
      </div>
      {rows.map((row) => (
        <div className="rules-row" key={row.id}>
          <span className="rules-cell is-name">{row.label}</span>
          <span className={cellClass(row.self)}>{formatCell(row.self)}</span>
          {threePlayer && <span className={cellClass(row.upper)}>{formatCell(row.upper)}</span>}
          {threePlayer && <span className={cellClass(row.lower)}>{formatCell(row.lower)}</span>}
        </div>
      ))}
    </div>
  )
}

export function HomePage({ sharedMode, starting, startError, onStart, onContinue }: HomePageProps) {
  const [playerCount, setPlayerCount] = useState(2)
  const [threeMode, setThreeMode] = useState<ThreeMode>('all')
  const [names, setNames] = useState<string[]>(() => ['玩家1', '玩家2'])
  const [lastMatch] = useState<LastMatchMeta | null>(() => loadLastMatchMeta())
  const [showRules, setShowRules] = useState(false)
  const [rulesTab, setRulesTab] = useState<'two' | 'three'>('two')
  const [threeRulesMode, setThreeRulesMode] = useState<ThreeMode>('all')
  const rulesPanelRef = useRef<HTMLDivElement>(null)

  function switchRulesTab(tab: 'two' | 'three') {
    setRulesTab(tab)
    rulesPanelRef.current?.scrollTo({ top: 0 })
  }

  function switchThreeRules(mode: ThreeMode) {
    setThreeRulesMode(mode)
    rulesPanelRef.current?.scrollTo({ top: 0 })
  }

  function chooseCount(count: number) {
    setPlayerCount(count)
    setNames((prev) => Array.from({ length: count }, (_, index) => prev[index] ?? `玩家${index + 1}`))
  }

  function updateName(index: number, value: string) {
    setNames((prev) => {
      const next = [...prev]
      next[index] = value
      return next
    })
  }

  function handleStart() {
    if (!sharedMode && lastMatch && lastMatch.actionCount > 0) {
      const confirmed = window.confirm('本地模式下新开一局会覆盖当前这局，确定吗？')
      if (!confirmed) return
    }
    onStart(
      Array.from({ length: playerCount }, (_, index) => names[index]?.trim() || `玩家${index + 1}`),
      threeMode,
    )
  }

  return (
    <main className="home">
      <div className="home-card">
        <p className="eyebrow">
          台球.追分
          {!sharedMode && <span className="mode-badge">本地模式</span>}
        </p>
        <h1>欢迎来追分</h1>
        <p className="lead">选人数、填昵称，点一下就能记分。</p>

        <button type="button" className="rules-entry" onClick={() => setShowRules(true)}>
          <span>玩法与计分规则</span>
          <span className="rules-entry-arrow" aria-hidden="true">
            ›
          </span>
        </button>

        <div className="field">
          <span className="field-label">本局人数</span>
          <div className="segmented" role="group" aria-label="本局人数">
            {PLAYER_COUNTS.map((count) => (
              <button
                key={count}
                type="button"
                aria-pressed={playerCount === count}
                onClick={() => chooseCount(count)}
              >
                {count} 人
              </button>
            ))}
          </div>
        </div>

        {playerCount === 3 && (
          <div className="field">
            <span className="field-label">三人结算方式</span>
            <div className="segmented" role="group" aria-label="三人结算方式">
              {THREE_MODES.map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  aria-pressed={threeMode === mode.id}
                  onClick={() => setThreeMode(mode.id)}
                >
                  {mode.label}
                </button>
              ))}
            </div>
            <p className="field-hint">
              {THREE_MODES.find((mode) => mode.id === threeMode)?.hint}
            </p>
          </div>
        )}

        <div className="field">
          <span className="field-label">玩家昵称</span>
          <div className="names-grid">
            {Array.from({ length: playerCount }, (_, index) => (
              <label className="name-field" key={index}>
                <span>玩家 {index + 1}</span>
                <input
                  className="name-input"
                  type="text"
                  maxLength={12}
                  value={names[index] ?? ''}
                  placeholder={`玩家${index + 1}`}
                  onChange={(event) => updateName(index, event.target.value)}
                />
              </label>
            ))}
          </div>
          {playerCount === 3 ? (
            <p className="field-hint">
              按填写顺序循环：前一位是上家，后一位是下家。点当事人的按钮，由系统自动结算。
            </p>
          ) : (
            <p className="field-hint">
              两人局各自加减分：另有 4 个让杆项，点谁的卡片就只改谁的分。
            </p>
          )}
        </div>

        <button type="button" className="primary-btn" onClick={handleStart} disabled={starting}>
          {starting ? '正在创建…' : '现在开始追分'}
        </button>

        {lastMatch && (
          <button type="button" className="ghost-btn" onClick={() => onContinue(lastMatch.id)}>
            继续上一局 · {lastMatch.playerCount} 人 · 已记 {lastMatch.actionCount} 笔
          </button>
        )}

        {startError && <p className="form-error">{startError}</p>}

        <p className="footnote">
          {sharedMode ? '同一链接的朋友可以一起记分，实时同步。' : '仅用于线下娱乐记分，不涉及任何金钱或财物。'}
        </p>
      </div>

      {showRules && (
        <div
          className="modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="rules-title"
          onClick={(event) => {
            if (event.target === event.currentTarget) setShowRules(false)
          }}
        >
          <div className="modal-card rules-card">
            <div className="rules-head">
              <h2 id="rules-title">玩法与计分</h2>
              <button type="button" className="rules-close" onClick={() => setShowRules(false)}>
                关闭
              </button>
            </div>

            <div className="segmented rules-tabs" role="group" aria-label="玩法分类">
              <button
                type="button"
                aria-pressed={rulesTab === 'two'}
                onClick={() => switchRulesTab('two')}
              >
                两人追分
              </button>
              <button
                type="button"
                aria-pressed={rulesTab === 'three'}
                onClick={() => switchRulesTab('three')}
              >
                三人追分
              </button>
            </div>

            {rulesTab === 'three' && (
              <div className="rules-three-head">
                <p>按昵称填写顺序围成一圈：前一位是上家，后一位是下家，点当事人的按钮自动结算。</p>
                <div className="segmented rules-mode" role="group" aria-label="三人结算方式">
                  <button
                    type="button"
                    aria-pressed={threeRulesMode === 'all'}
                    onClick={() => switchThreeRules('all')}
                  >
                    通赔
                  </button>
                  <button
                    type="button"
                    aria-pressed={threeRulesMode === 'upper'}
                    onClick={() => switchThreeRules('upper')}
                  >
                    只赔上家
                  </button>
                </div>
              </div>
            )}

            <div className="rules-panel" ref={rulesPanelRef}>
              {rulesTab === 'two' ? (
                <section className="rules-section">
                  <p>各记各的分：点谁的按钮，就只改谁的分数。两人局共 12 项，其中 4 项是让杆。</p>
                  <RulesTable rows={TWO_PLAYER_ROWS} />
                </section>
              ) : threeRulesMode === 'all' ? (
                <section className="rules-section">
                  <p>大金、黄金9、大黑金、黄金9黑金由另外两家各赔一份。</p>
                  <RulesTable rows={THREE_ALL_ROWS} threePlayer />
                </section>
              ) : (
                <section className="rules-section">
                  <p>以下 5 项与通赔不同，其余 {THREE_SAME_COUNT} 项照常结算。</p>
                  <RulesTable rows={THREE_UPPER_DIFF_ROWS} threePlayer />
                </section>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
