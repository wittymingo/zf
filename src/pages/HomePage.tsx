import { useState } from 'react'
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

export function HomePage({ sharedMode, starting, startError, onStart, onContinue }: HomePageProps) {
  const [playerCount, setPlayerCount] = useState(2)
  const [threeMode, setThreeMode] = useState<ThreeMode>('all')
  const [names, setNames] = useState<string[]>(() => ['玩家1', '玩家2'])
  const [lastMatch] = useState<LastMatchMeta | null>(() => loadLastMatchMeta())

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
          {sharedMode ? '同一链接的朋友可以一起记分，实时同步。' : '未配置 Supabase，分数只保存在这台设备。'}
        </p>
      </div>
    </main>
  )
}
