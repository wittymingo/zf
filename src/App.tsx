import { useEffect, useState } from 'react'
import { isSharedMode, matchRepo, saveLastMatchMeta } from './storage'
import { HomePage } from './pages/HomePage'
import { MatchPage } from './pages/MatchPage'
import type { ThreeMode } from './types'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function readMatchId(): string | null {
  const id = new URLSearchParams(window.location.search).get('match')
  return id && UUID_RE.test(id) ? id : null
}

export default function App() {
  const [matchId, setMatchId] = useState<string | null>(() => readMatchId())
  const [starting, setStarting] = useState(false)
  const [startError, setStartError] = useState<string | null>(null)

  useEffect(() => {
    const onPopState = () => setMatchId(readMatchId())
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  function navigate(id: string | null) {
    const url = new URL(window.location.href)
    if (id) url.searchParams.set('match', id)
    else url.searchParams.delete('match')
    window.history.pushState(null, '', url)
    setMatchId(id)
  }

  async function handleStart(playerNames: string[], threeMode: ThreeMode) {
    setStarting(true)
    setStartError(null)
    try {
      const created = await matchRepo.createMatch(playerNames, threeMode)
      saveLastMatchMeta(created)
      navigate(created.id)
    } catch {
      setStartError('创建对局失败，请检查网络后重试。')
    } finally {
      setStarting(false)
    }
  }

  if (matchId) {
    return (
      <MatchPage
        key={matchId}
        matchId={matchId}
        sharedMode={isSharedMode}
        onExit={() => navigate(null)}
      />
    )
  }

  return (
    <HomePage
      sharedMode={isSharedMode}
      starting={starting}
      startError={startError}
      onStart={handleStart}
      onContinue={(id) => navigate(id)}
    />
  )
}
