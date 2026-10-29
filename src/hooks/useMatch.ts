import { useCallback, useEffect, useRef, useState } from 'react'
import { isSharedMode, matchRepo, saveLastMatchMeta } from '../storage'
import type { SyncState } from '../storage/types'
import type { Match, ScoreAction, ScoreTransfer, ScoreType } from '../types'

export function useMatch(matchId: string | null) {
  const [match, setMatch] = useState<Match | null>(null)
  const [loading, setLoading] = useState(Boolean(matchId))
  const [notFound, setNotFound] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [syncState, setSyncState] = useState<SyncState>(isSharedMode ? 'connecting' : 'live')

  const requestRef = useRef(0)
  const syncRef = useRef<SyncState>(syncState)
  const pendingNames = useRef(new Map<string, string>())
  const renameTimers = useRef(new Map<string, number>())

  const refresh = useCallback(async () => {
    if (!matchId) return
    const request = ++requestRef.current
    try {
      const next = await matchRepo.loadMatch(matchId)
      if (request !== requestRef.current) return
      if (!next) {
        setMatch(null)
        setNotFound(true)
      } else {
        const names = pendingNames.current
        setMatch(
          names.size === 0
            ? next
            : {
                ...next,
                players: next.players.map((player) =>
                  names.has(player.id) ? { ...player, name: names.get(player.id) ?? player.name } : player,
                ),
              },
        )
        setNotFound(false)
      }
      setError(null)
    } catch {
      if (request === requestRef.current) setError('连不上服务器，请检查网络后重试。')
    } finally {
      if (request === requestRef.current) setLoading(false)
    }
  }, [matchId])

  useEffect(() => {
    if (!matchId) return
    setLoading(true)
    setNotFound(false)
    void refresh()
  }, [matchId, refresh])

  useEffect(() => {
    if (!matchId) return
    let timer: number | undefined

    const unsubscribe = matchRepo.subscribe(
      matchId,
      () => {
        window.clearTimeout(timer)
        timer = window.setTimeout(() => void refresh(), 120)
      },
      (state) => {
        setSyncState(state)
        if (state === 'live' && syncRef.current !== 'live') void refresh()
        syncRef.current = state
      },
    )

    return () => {
      window.clearTimeout(timer)
      unsubscribe()
    }
  }, [matchId, refresh])

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'visible') void refresh()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [refresh])

  useEffect(() => {
    if (match) saveLastMatchMeta(match)
  }, [match])

  useEffect(() => {
    const timers = renameTimers.current
    const names = pendingNames.current
    const id = matchId
    return () => {
      for (const timer of timers.values()) window.clearTimeout(timer)
      timers.clear()
      if (id && names.size > 0) {
        for (const [playerId, name] of names) {
          if (name.trim()) void matchRepo.renamePlayer(id, playerId, name.trim()).catch(() => {})
        }
        names.clear()
      }
    }
  }, [matchId])

  const addScore = useCallback(
    (playerId: string, type: ScoreType, transfers?: ScoreTransfer[]) => {
      if (!matchId) return
      const at = Date.now()
      const selfDelta = transfers?.find((item) => item.playerId === playerId)?.delta
      const action: ScoreAction = {
        id: uid(),
        playerId,
        typeId: type.id,
        delta: selfDelta ?? type.delta,
        at,
        ...(transfers ? { transfers } : {}),
      }
      setMatch((prev) =>
        prev ? { ...prev, updatedAt: at, actions: [...prev.actions, action] } : prev,
      )
      matchRepo
        .addAction(matchId, action)
        .then(() => setError(null))
        .catch(() => {
          setMatch((prev) =>
            prev ? { ...prev, actions: prev.actions.filter((item) => item.id !== action.id) } : prev,
          )
          setError('这次记分没有保存成功，请检查网络后重试。')
        })
    },
    [matchId],
  )

  const undo = useCallback(() => {
    if (!match || !matchId || match.actions.length === 0) return
    const last = match.actions[match.actions.length - 1]
    setMatch((prev) => (prev ? { ...prev, actions: prev.actions.slice(0, -1) } : prev))

    matchRepo
      .undoLast(matchId)
      .then(() => setError(null))
      .catch(() => {
        setMatch((prev) => (prev ? { ...prev, actions: [...prev.actions, last] } : prev))
        setError('撤销失败，请检查网络后重试。')
      })
  }, [match, matchId])

  const reset = useCallback(() => {
    if (!match || !matchId || match.actions.length === 0) return
    const previous = match.actions
    setMatch((prev) => (prev ? { ...prev, updatedAt: Date.now(), actions: [] } : prev))

    matchRepo
      .clearActions(matchId)
      .then(() => setError(null))
      .catch(() => {
        setMatch((prev) => (prev ? { ...prev, actions: previous } : prev))
        setError('重置失败，请检查网络后重试。')
      })
  }, [match, matchId])

  const renamePlayer = useCallback(
    (playerId: string, name: string) => {
      setMatch((prev) =>
        prev
          ? {
              ...prev,
              players: prev.players.map((player) =>
                player.id === playerId ? { ...player, name } : player,
              ),
            }
          : prev,
      )
      if (!matchId) return

      const timers = renameTimers.current
      const pending = timers.get(playerId)
      if (pending) window.clearTimeout(pending)

      if (!name.trim()) {
        pendingNames.current.delete(playerId)
        return
      }
      pendingNames.current.set(playerId, name)

      const timer = window.setTimeout(() => {
        timers.delete(playerId)
        if (!matchId) return
        matchRepo
          .renamePlayer(matchId, playerId, name.trim())
          .then(() => pendingNames.current.delete(playerId))
          .catch(() => {
            pendingNames.current.delete(playerId)
            void refresh().finally(() => setError('名字没有保存成功，请检查网络后重试。'))
          })
      }, 400)
      timers.set(playerId, timer)
    },
    [matchId, refresh],
  )

  return {
    match,
    loading,
    notFound,
    error,
    syncState,
    addScore,
    undo,
    reset,
    renamePlayer,
    retry: refresh,
  }
}

function uid(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}
